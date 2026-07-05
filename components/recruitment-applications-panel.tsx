"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { formatLimitBreak, formatSeaWeaponLevel } from "@/lib/authz";
import { getRoleLabel } from "@/lib/constants";

const IMAGINE_CATEGORY_ORDER = ["S1", "S2", "S3", "EVENT"] as const;

type ApplicationProfile = {
  character_name?: string | null;
  uid?: string | null;
  class_name?: string | null;
  power?: number | null;
  dps_3min?: number | null;
  sea_weapon_level?: number | null;
  discord_global_name?: string | null;
  discord_username?: string | null;
  profile_updated_at?: string | null;
  imagines?: Array<{ category: string; name: string; limit_break: number }>;
};

type ApplicationRow = {
  id: number;
  applicant_discord_user_id: string;
  requested_role: "DPS" | "TANK" | "HEALER";
  message: string | null;
  status: string;
  created_at?: string | null;
  profiles?: ApplicationProfile | ApplicationProfile[] | null;
};

function getProfile(application: ApplicationRow) {
  return Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;
}

function displayName(profile?: ApplicationProfile | null) {
  return profile?.character_name || profile?.discord_global_name || profile?.discord_username || "申請者";
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("ja-JP");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "approved") return "承認済み";
  if (status === "rejected") return "却下済み";
  return "未処理";
}

function imagineCategoryLabel(category: string) {
  return category === "EVENT" ? "イベント" : category;
}

function groupedImagines(profile?: ApplicationProfile | null) {
  const grouped: Record<string, Array<{ name: string; limit_break: number }>> = { S1: [], S2: [], S3: [], EVENT: [] };
  for (const imagine of profile?.imagines ?? []) {
    if (!grouped[imagine.category]) continue;
    grouped[imagine.category].push({ name: imagine.name, limit_break: imagine.limit_break });
  }
  return grouped;
}

export function RecruitmentApplicationsPanel({ recruitmentId }: { recruitmentId: string }) {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [message, setMessage] = useState("申請一覧を読み込みます。");
  const [openApplicationId, setOpenApplicationId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/recruitments/${recruitmentId}`, { cache: "no-store" });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "申請一覧を取得できませんでした");
      return;
    }

    const nextApplications = result.applications || [];
    setApplications(nextApplications);
    setMessage(nextApplications.length ? "申請者を選んで詳細を確認してください。" : "まだ申請はありません。");
    setOpenApplicationId((current) => current ?? nextApplications[0]?.id ?? null);
  }, [recruitmentId]);

  async function review(applicationId: number, action: "approve" | "reject") {
    setMessage("処理中...");
    const response = await fetch(`/api/recruitments/${recruitmentId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "処理できませんでした");
      return;
    }

    await load();
  }

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="compact-panel applications-panel">
      <h2>申請一覧</h2>
      <p className={message.includes("できません") ? "message error" : "message"}>{message}</p>
      <div className="application-list">
        {applications.map((application) => {
          const profile = getProfile(application);
          const name = displayName(profile);
          const isOpen = openApplicationId === application.id;

          return (
            <article className={isOpen ? "application-card open" : "application-card"} key={application.id}>
              <div className="application-summary">
                <button className="application-name-button" type="button" onClick={() => setOpenApplicationId(isOpen ? null : application.id)} aria-expanded={isOpen}>
                  <strong>{name}</strong>
                  <span className={`status-pill ${application.status === "pending" ? "open" : "in_progress"}`}>{statusLabel(application.status)}</span>
                </button>
                <button className="button secondary small" type="button" onClick={() => setOpenApplicationId(isOpen ? null : application.id)}>
                  {isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                  詳細
                </button>
              </div>

              {isOpen ? (
                <div className="application-detail">
                  <dl className="application-detail-grid">
                    <div><dt>申請ロール</dt><dd>{getRoleLabel(application.requested_role)}</dd></div>
                    <div><dt>クラス</dt><dd>{profile?.class_name || "-"}</dd></div>
                    <div><dt>戦力</dt><dd>{formatNumber(profile?.power)}</dd></div>
                    <div><dt>3分合計DPS</dt><dd>{formatNumber(profile?.dps_3min)}</dd></div>
                    <div><dt>UID</dt><dd>{profile?.uid || "-"}</dd></div>
                    <div><dt>海武器</dt><dd>{formatSeaWeaponLevel(profile?.sea_weapon_level ?? null)}</dd></div>
                    <div><dt>Discord</dt><dd>{profile?.discord_global_name || profile?.discord_username || "-"}</dd></div>
                    <div><dt>申請日時</dt><dd>{formatDate(application.created_at)}</dd></div>
                  </dl>

                  <div className="application-note"><span>申請コメント</span><p>{application.message || "コメントなし"}</p></div>

                  <div className="application-imagines">
                    <span>所持イマジン</span>
                    {profile?.imagines?.length ? (
                      <div className="application-imagine-groups">
                        {IMAGINE_CATEGORY_ORDER.map((category) => {
                          const imagines = groupedImagines(profile)[category];
                          if (!imagines.length) return null;
                          return (
                            <div className="application-imagine-group" key={category}>
                              <strong>{imagineCategoryLabel(category)}</strong>
                              <ul>{imagines.map((imagine) => <li key={`${category}-${imagine.name}`}>{imagine.name}: {formatLimitBreak(imagine.limit_break)}</li>)}</ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p>所持イマジンなし</p>}
                  </div>

                  {application.status === "pending" ? (
                    <div className="application-actions">
                      <button className="button primary compact" type="button" onClick={() => review(application.id, "approve")}><Check size={17} aria-hidden="true" />承認</button>
                      <button className="button secondary compact" type="button" onClick={() => review(application.id, "reject")}><X size={17} aria-hidden="true" />却下</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
