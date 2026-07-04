import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserFromSession, requireGuildMembershipApi } from "@/lib/authz";
import { createSupabaseAdmin } from "@/lib/supabase";

function isFull(roleSlots: Record<string, { required?: number; accepted?: number }>) {
  return ["DPS", "TANK", "HEALER"].every((role) => {
    const slot = roleSlots[role] ?? { required: 0, accepted: 0 };
    return Number(slot.accepted ?? 0) >= Number(slot.required ?? 0);
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; applicationId: string }> }) {
  const [{ id, applicationId }, session] = await Promise.all([params, auth()]);
  const user = getUserFromSession(session);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildError = await requireGuildMembershipApi(user.id);
  if (guildError) {
    return guildError;
  }

  const body = await request.json();
  const action = body.action;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const recruitmentId = Number(id);
  const appId = Number(applicationId);

  const { data: recruitment, error: recruitmentError } = await supabase
    .from("recruitments")
    .select("id, owner_discord_user_id, status, role_slots")
    .eq("id", recruitmentId)
    .maybeSingle();

  if (recruitmentError) {
    return NextResponse.json({ error: recruitmentError.message }, { status: 500 });
  }

  if (!recruitment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (recruitment.owner_discord_user_id !== user.id) {
    return NextResponse.json({ error: "募集主のみ操作できます" }, { status: 403 });
  }

  if (recruitment.status !== "open") {
    return NextResponse.json({ error: "この募集は申請を処理できません" }, { status: 400 });
  }

  const { data: application, error: applicationError } = await supabase
    .from("recruitment_applications")
    .select("id, recruitment_id, applicant_discord_user_id, requested_role, status")
    .eq("id", appId)
    .eq("recruitment_id", recruitmentId)
    .maybeSingle();

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 500 });
  }

  if (!application) {
    return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  }

  if (application.status !== "pending") {
    return NextResponse.json({ error: "この申請は処理済みです" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const { error } = await supabase
      .from("recruitment_applications")
      .delete()
      .eq("id", appId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "rejected", deleted: true });
  }

  const roleSlots = recruitment.role_slots as Record<string, { required?: number; accepted?: number }>;
  const requestedRole = application.requested_role as "DPS" | "TANK" | "HEALER";
  const slot = roleSlots[requestedRole] ?? { required: 0, accepted: 0 };

  if (Number(slot.accepted ?? 0) >= Number(slot.required ?? 0)) {
    return NextResponse.json({ error: "このロールは募集人数に達しています" }, { status: 400 });
  }

  roleSlots[requestedRole] = {
    required: Number(slot.required ?? 0),
    accepted: Number(slot.accepted ?? 0) + 1
  };

  const nextStatus = isFull(roleSlots) ? "in_progress" : "open";

  const { error: approveError } = await supabase
    .from("recruitment_applications")
    .update({ status: "approved", reviewed_at: now, updated_at: now })
    .eq("id", appId);

  if (approveError) {
    return NextResponse.json({ error: approveError.message }, { status: 500 });
  }

  const { error: updateRecruitmentError } = await supabase
    .from("recruitments")
    .update({ role_slots: roleSlots, status: nextStatus, updated_at: now })
    .eq("id", recruitmentId);

  if (updateRecruitmentError) {
    return NextResponse.json({ error: updateRecruitmentError.message }, { status: 500 });
  }

  if (nextStatus === "in_progress") {
    const { error: jobError } = await supabase.from("discord_bot_jobs").insert({
      job_type: "party_create",
      recruitment_id: recruitmentId,
      payload: { recruitmentId },
      status: "pending",
      available_at: now
    });

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, status: "approved", recruitmentStatus: nextStatus });
}