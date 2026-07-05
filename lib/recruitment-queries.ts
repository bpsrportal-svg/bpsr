import type { Recruitment } from "@/lib/portal-sample-data";
import { recruitments as sampleRecruitments } from "@/lib/portal-sample-data";
import { createSupabaseAdmin } from "@/lib/supabase";

type DbRecruitment = {
  id: number;
  title: string;
  content_name: string;
  content_mode: string | null;
  conditions: string | null;
  vc_mode: "なし" | "あり" | "あり（プライベート）";
  status: "open" | "in_progress" | "closed" | "cancelled";
  role_slots: {
    DPS?: { required?: number; accepted?: number };
    TANK?: { required?: number; accepted?: number };
    HEALER?: { required?: number; accepted?: number };
  } | null;
  updated_at: string;
  profiles?: {
    discord_global_name?: string | null;
    discord_username?: string | null;
    character_name?: string | null;
    class_name?: string | null;
    power?: number | null;
  } | null;
};

export type RecruitmentDetail = Recruitment & {
  ownerDiscordUserId?: string;
  requiredClasses?: Record<string, string[]>;
};

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function slotTuple(slot?: { required?: number; accepted?: number }): [number, number] {
  return [Number(slot?.accepted ?? 0), Number(slot?.required ?? 0)];
}

function toRecruitment(row: DbRecruitment): Recruitment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: String(row.id),
    title: row.title,
    content: row.content_name,
    mode: row.content_mode || "通常",
    condition: row.conditions || "条件なし",
    vc: row.vc_mode,
    status: row.status === "cancelled" ? "closed" : row.status,
    updatedAt: relativeTime(row.updated_at),
    host: {
      name: profile?.character_name || profile?.discord_global_name || profile?.discord_username || "募集主",
      className: profile?.class_name || "-",
      power: Number(profile?.power ?? 0)
    },
    slots: {
      dps: slotTuple(row.role_slots?.DPS),
      tank: slotTuple(row.role_slots?.TANK),
      healer: slotTuple(row.role_slots?.HEALER)
    },
    tags: [row.status === "open" ? "募集中" : "募集〆", row.vc_mode]
  };
}

const recruitmentSelect = `
  id,
  title,
  content_name,
  content_mode,
  conditions,
  vc_mode,
  status,
  role_slots,
  updated_at,
  profiles:owner_discord_user_id (
    discord_username,
    discord_global_name,
    character_name,
    class_name,
    power
  )
`;

export async function getRecruitmentsForPage(): Promise<Recruitment[]> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("recruitments")
      .select(recruitmentSelect)
      .in("status", ["open", "in_progress"])
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error || !data?.length) return sampleRecruitments;
    return (data as DbRecruitment[]).map(toRecruitment);
  } catch {
    return sampleRecruitments;
  }
}

export async function getRecruitmentForPage(id: string): Promise<Recruitment | null> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("recruitments")
      .select(recruitmentSelect)
      .eq("id", Number(id))
      .maybeSingle();

    if (error || !data) return sampleRecruitments.find((item) => item.id === id) ?? null;
    return toRecruitment(data as DbRecruitment);
  } catch {
    return sampleRecruitments.find((item) => item.id === id) ?? null;
  }
}
