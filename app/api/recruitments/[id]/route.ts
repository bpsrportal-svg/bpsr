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
    .select("id, applicant_discord_user_id, requested_role, message, status, created_at, profiles:applicant_discord_user_id(character_name, uid, class_name, power, dps_3min, sea_weapon_level, discord_global_name, discord_username, discord_avatar, profile_updated_at)")
    .eq("recruitment_id", Number(id))
    .order("created_at", { ascending: true });

  if (applicationsError) {
    return NextResponse.json({ error: applicationsError.message }, { status: 500 });
  }

  const applicantIds = [...new Set((applications ?? []).map((application) => application.applicant_discord_user_id).filter(Boolean))];
  const { data: imagines, error: imaginesError } = applicantIds.length
    ? await supabase
      .from("user_imagines")
      .select("discord_user_id, limit_break, imagine_masters(category, name, sort_order)")
      .in("discord_user_id", applicantIds)
      .gte("limit_break", 0)
    : { data: [], error: null };

  if (imaginesError) {
    return NextResponse.json({ error: imaginesError.message }, { status: 500 });
  }

  const imaginesByUser = new Map<string, Array<{ category: string; name: string; limit_break: number; sort_order: number }>>();
  for (const row of imagines ?? []) {
    const master = Array.isArray(row.imagine_masters) ? row.imagine_masters[0] : row.imagine_masters;
    if (!master) continue;
    const list = imaginesByUser.get(row.discord_user_id) ?? [];
    list.push({
      category: master.category,
      name: master.name,
      limit_break: row.limit_break,
      sort_order: master.sort_order ?? 0
    });
    imaginesByUser.set(row.discord_user_id, list);
  }

  const applicationsWithImagines = (applications ?? []).map((application) => {
    const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;
    const userImagines = (imaginesByUser.get(application.applicant_discord_user_id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ja"));

    return {
      ...application,
      profiles: profile ? { ...profile, imagines: userImagines } : profile
    };
  });

  return NextResponse.json({ recruitment, applications: applicationsWithImagines });
}