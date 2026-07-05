import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserFromSession, requireGuildMembershipApi } from "@/lib/authz";
import { recruitmentCreateSchema } from "@/lib/recruitment-schema";
import { createSupabaseAdmin } from "@/lib/supabase";

const recruitmentSelect = `
  id,
  owner_discord_user_id,
  title,
  content_category,
  content_name,
  content_mode,
  conditions,
  vc_mode,
  status,
  role_slots,
  required_classes,
  created_at,
  updated_at,
  closed_at,
  discord_notification_channel_id,
  discord_notification_message_id,
  profiles:owner_discord_user_id (
    discord_username,
    discord_global_name,
    discord_avatar,
    character_name,
    class_name,
    power,
    dps_3min,
    sea_weapon_level
  )
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status") || "open";
  const contentId = searchParams.get("content_id");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 60);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("recruitments")
    .select(recruitmentSelect, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (contentId) {
    query = query.eq("content_id", Number(contentId));
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,conditions.ilike.%${q}%,content_name.ilike.%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recruitments: data ?? [], total: count ?? 0 });
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

  const parsed = recruitmentCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容を確認してください", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  const input = parsed.data;
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("discord_user_id, character_name, uid, class_name")
    .eq("discord_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "プロフィールを先に登録してください" }, { status: 400 });
  }

  const { data: mode, error: modeError } = await supabase
    .from("content_mode_masters")
    .select("id, name, content_id, content_masters(category, name)")
    .eq("id", input.modeId)
    .eq("content_id", input.contentId)
    .maybeSingle();

  if (modeError) {
    return NextResponse.json({ error: modeError.message }, { status: 500 });
  }

  if (!mode || !mode.content_masters) {
    return NextResponse.json({ error: "存在しないコンテンツまたはモードです" }, { status: 400 });
  }

  const contentMaster = Array.isArray(mode.content_masters) ? mode.content_masters[0] : mode.content_masters;

  const { data: recruitment, error: recruitmentError } = await supabase
    .from("recruitments")
    .insert({
      owner_discord_user_id: user.id,
      title: input.title,
      content_id: input.contentId,
      content_mode_id: input.modeId,
      content_category: contentMaster.category,
      content_name: contentMaster.name,
      content_mode: mode.name,
      conditions: input.conditions,
      vc_mode: input.vcMode,
      status: "open",
      role_slots: input.roleSlots,
      required_classes: input.requiredClasses,
      source: "web",
      visibility: "public",
      created_at: now,
      updated_at: now
    })
    .select("id")
    .single();

  if (recruitmentError) {
    return NextResponse.json({ error: recruitmentError.message }, { status: 500 });
  }

  const { error: jobError } = await supabase.from("discord_bot_jobs").insert({
    job_type: "recruitment_notify",
    recruitment_id: recruitment.id,
    payload: {
      recruitmentId: recruitment.id,
      createdBy: user.id
    },
    status: "pending",
    available_at: now
  });

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recruitmentId: recruitment.id });
}
