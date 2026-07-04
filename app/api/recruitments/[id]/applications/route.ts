import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserFromSession, requireGuildMembershipApi } from "@/lib/authz";
import { recruitmentApplySchema } from "@/lib/recruitment-schema";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const user = getUserFromSession(session);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildError = await requireGuildMembershipApi(user.id);
  if (guildError) {
    return guildError;
  }

  const parsed = recruitmentApplySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容を確認してください", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  const recruitmentId = Number(id);

  const { data: recruitment, error: recruitmentError } = await supabase
    .from("recruitments")
    .select("id, owner_discord_user_id, status, role_slots, title")
    .eq("id", recruitmentId)
    .maybeSingle();

  if (recruitmentError) {
    return NextResponse.json({ error: recruitmentError.message }, { status: 500 });
  }

  if (!recruitment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (recruitment.status !== "open") {
    return NextResponse.json({ error: "この募集は申請できません" }, { status: 400 });
  }

  if (recruitment.owner_discord_user_id === user.id) {
    return NextResponse.json({ error: "自分の募集には申請できません" }, { status: 400 });
  }

  const input = parsed.data;
  const slot = recruitment.role_slots?.[input.requestedRole];

  if (!slot || Number(slot.accepted ?? 0) >= Number(slot.required ?? 0)) {
    return NextResponse.json({ error: "このロールは募集人数に達しています" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("discord_user_id, class_name")
    .eq("discord_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "プロフィールを先に登録してください" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: application, error: applicationError } = await supabase
    .from("recruitment_applications")
    .insert({
      recruitment_id: recruitmentId,
      applicant_discord_user_id: user.id,
      requested_role: input.requestedRole,
      message: input.message,
      status: "pending",
      created_at: now,
      updated_at: now
    })
    .select("id")
    .single();

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 500 });
  }

  const { error: jobError } = await supabase.from("discord_bot_jobs").insert({
    job_type: "application_notify",
    recruitment_id: recruitmentId,
    payload: {
      recruitmentId,
      applicationId: application.id,
      applicantDiscordUserId: user.id,
      ownerDiscordUserId: recruitment.owner_discord_user_id
    },
    status: "pending",
    available_at: now
  });

  return NextResponse.json({ ok: true, applicationId: application.id, notificationQueued: !jobError });
}