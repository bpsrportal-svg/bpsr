import type { Recruitment } from "@/lib/portal-sample-data";
import { recruitments as sampleRecruitments } from "@/lib/portal-sample-data";
import { createSupabaseAdmin } from "@/lib/supabase";

type DbRecruitment = {
  id: number;
  title: string | null;
  content_name: string | null;
  content_mode: string | null;
  conditions: string | null;
  vc_mode: string | null;
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

const TEXT = {
  now: "\u305f\u3063\u305f\u4eca",
  minutesAgo: "\u5206\u524d",
  hoursAgo: "\u6642\u9593\u524d",
  daysAgo: "\u65e5\u524d",
  contentUnset: "\u30b3\u30f3\u30c6\u30f3\u30c4\u672a\u8a2d\u5b9a",
  modeUnset: "\u30e2\u30fc\u30c9\u672a\u8a2d\u5b9a",
  titleUnset: "\u52df\u96c6\u30bf\u30a4\u30c8\u30eb\u672a\u8a2d\u5b9a",
  conditionUnset: "\u6761\u4ef6\u306a\u3057",
  host: "\u52df\u96c6\u4e3b",
  open: "\u52df\u96c6\u4e2d",
  closed: "\u52df\u96c6\u3006",
  vcNone: "\u306a\u3057",
  vcPublic: "\u3042\u308a",
  vcPrivate: "\u3042\u308a\uff08\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8\uff09"
} as const;

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutes < 1) return TEXT.now;
  if (minutes < 60) return String(minutes) + TEXT.minutesAgo;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return String(hours) + TEXT.hoursAgo;
  return String(Math.floor(hours / 24)) + TEXT.daysAgo;
}

function slotTuple(slot?: { required?: number; accepted?: number }): [number, number] {
  return [Number(slot?.accepted ?? 0), Number(slot?.required ?? 0)];
}

function hasBrokenText(value: string | null | undefined) {
  return !value || /\?{2,}|\u7e1d|\u7e5d|\u870d|\u8373|\u9082|\u8b5b|\u8b0c|\u9666|\u8811/.test(value);
}

function cleanText(value: string | null | undefined, fallback: string): string {
  return hasBrokenText(value) ? fallback : value ?? fallback;
}

function cleanVcMode(value: string | null | undefined): Recruitment["vc"] {
  if (value === TEXT.vcPublic || value === TEXT.vcPrivate || value === TEXT.vcNone) return value;
  return TEXT.vcNone;
}

function toRecruitment(row: DbRecruitment): Recruitment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const content = cleanText(row.content_name, TEXT.contentUnset);
  const mode = cleanText(row.content_mode, TEXT.modeUnset);
  const vc = cleanVcMode(row.vc_mode);

  return {
    id: String(row.id),
    title: cleanText(row.title, TEXT.titleUnset),
    content,
    mode,
    condition: cleanText(row.conditions, TEXT.conditionUnset),
    vc,
    status: row.status === "cancelled" ? "closed" : row.status,
    updatedAt: relativeTime(row.updated_at),
    host: {
      name: cleanText(profile?.character_name || profile?.discord_global_name || profile?.discord_username, TEXT.host),
      className: cleanText(profile?.class_name, "-"),
      power: Number(profile?.power ?? 0)
    },
    slots: {
      dps: slotTuple(row.role_slots?.DPS),
      tank: slotTuple(row.role_slots?.TANK),
      healer: slotTuple(row.role_slots?.HEALER)
    },
    tags: [row.status === "open" ? TEXT.open : TEXT.closed, vc]
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
      .eq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error || !data?.length) return sampleRecruitments.filter((item) => item.status === "open");
    return (data as DbRecruitment[]).map(toRecruitment);
  } catch {
    return sampleRecruitments.filter((item) => item.status === "open");
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
