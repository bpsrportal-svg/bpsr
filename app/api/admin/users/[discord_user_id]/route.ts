import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { createSupabaseAdmin } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{
    discord_user_id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApi();

  if (admin instanceof NextResponse) {
    return admin;
  }

  const { discord_user_id: discordUserId } = await context.params;
  const supabase = createSupabaseAdmin();

  const [{ data: profile, error: profileError }, { data: imagines, error: imaginesError }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "discord_user_id, discord_username, discord_global_name, discord_avatar, character_name, uid, class_name, power, dps_3min, sea_weapon_level, profile_updated_at"
      )
      .eq("discord_user_id", discordUserId)
      .maybeSingle(),
    supabase
      .from("user_imagines")
      .select("limit_break, imagine_masters(category, name, sort_order)")
      .eq("discord_user_id", discordUserId)
  ]);

  if (profileError || imaginesError) {
    return NextResponse.json({ error: profileError?.message ?? imaginesError?.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mappedImagines = (imagines ?? [])
    .map((row) => {
      const master = Array.isArray(row.imagine_masters) ? row.imagine_masters[0] : row.imagine_masters;

      return {
        category: master?.category ?? "",
        name: master?.name ?? "",
        sort_order: master?.sort_order ?? 0,
        limit_break: row.limit_break
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return NextResponse.json({
    profile,
    imagines: mappedImagines.map((imagine) => ({ category: imagine.category, name: imagine.name, limit_break: imagine.limit_break }))
  });
}
