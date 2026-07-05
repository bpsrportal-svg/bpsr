import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserFromSession, requireGuildMembershipApi } from "@/lib/authz";
import { createSupabaseAdmin } from "@/lib/supabase";
import { profileInputSchema } from "@/lib/profile-schema";

export async function GET() {
  const session = await auth();
  const user = getUserFromSession(session);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildError = await requireGuildMembershipApi(user.id);
  if (guildError) {
    return guildError;
  }

  const supabase = createSupabaseAdmin();
  const discordUserId = user.id;

  const [{ data: profile, error: profileError }, { data: masters, error: mastersError }, { data: userImagines, error: userImaginesError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("discord_user_id", discordUserId).maybeSingle(),
      supabase.from("imagine_masters").select("id, category, name, sort_order, icon_url, is_active").eq("is_active", true).order("category").order("sort_order").order("name"),
      supabase.from("user_imagines").select("imagine_id, limit_break, updated_at").eq("discord_user_id", discordUserId)
    ]);

  if (profileError || mastersError || userImaginesError) {
    return NextResponse.json(
      { error: profileError?.message ?? mastersError?.message ?? userImaginesError?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    discordUser: {
      id: user.id,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar
    },
    profile,
    imagineMasters: masters ?? [],
    userImagines: userImagines ?? []
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const user = getUserFromSession(session);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildError = await requireGuildMembershipApi(user.id);
  if (guildError) {
    return guildError;
  }

  const parsed = profileInputSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容を確認してください", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  const discordUserId = user.id;
  const now = new Date().toISOString();
  const input = parsed.data;

  const { data: masters, error: mastersError } = await supabase
    .from("imagine_masters")
    .select("id")
    .in(
      "id",
      input.imagines.map((imagine) => imagine.imagineId)
    );

  if (mastersError) {
    return NextResponse.json({ error: mastersError.message }, { status: 500 });
  }

  if ((masters ?? []).length !== input.imagines.length) {
    return NextResponse.json({ error: "存在しないイマジンが含まれています" }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      discord_user_id: discordUserId,
      discord_username: user.username,
      discord_global_name: user.globalName,
      discord_avatar: user.avatar,
      character_name: input.characterName || null,
      uid: input.uid || null,
      class_name: input.className,
      power: input.power,
      dps_3min: input.dps3min,
      sea_weapon_level: input.seaWeaponLevel,
      profile_updated_at: now
    },
    { onConflict: "discord_user_id" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const imagineRows = input.imagines.map((imagine) => ({
    discord_user_id: discordUserId,
    imagine_id: imagine.imagineId,
    limit_break: imagine.limitBreak,
    updated_at: now
  }));

  const { error: imaginesError } = await supabase
    .from("user_imagines")
    .upsert(imagineRows, { onConflict: "discord_user_id,imagine_id" });

  if (imaginesError) {
    return NextResponse.json({ error: imaginesError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profileUpdatedAt: now });
}

