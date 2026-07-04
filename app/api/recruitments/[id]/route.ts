import { NextResponse } from "next/server";
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
    uid,
    class_name,
    power,
    dps_3min,
    sea_weapon_level
  )
`;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  const { data: recruitment, error } = await supabase
    .from("recruitments")
    .select(recruitmentSelect)
    .eq("id", Number(id))
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!recruitment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: applications, error: applicationsError } = await supabase
    .from("recruitment_applications")
    .select("id, applicant_discord_user_id, requested_role, message, status, created_at, profiles:applicant_discord_user_id(character_name, uid, class_name, power, dps_3min, discord_global_name, discord_username, discord_avatar)")
    .eq("recruitment_id", Number(id))
    .order("created_at", { ascending: true });

  if (applicationsError) {
    return NextResponse.json({ error: applicationsError.message }, { status: 500 });
  }

  return NextResponse.json({ recruitment, applications: applications ?? [] });
}