"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";

type ApplicationProfile = {
  character_name?: string | null;
  class_name?: string | null;
  power?: number | null;
  discord_global_name?: string | null;
  discord_username?: string | null;
};

type ApplicationRow = {
  id: number;
  requested_role: "DPS" | "TANK" | "HEALER";
  message: string | null;
  status: string;
  profiles?: ApplicationProfile | ApplicationProfile[] | null;
};

export function RecruitmentApplicationsPanel({ recruitmentId }: { recruitmentId: string }) {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [message, setMessage] = useState("申請一覧を読み込みます。");

  const load = useCallback(async () => {
    const response = await fetch(`/api/recruitments/${recruitmentId}`, { cache: "no-store" });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "申請一覧を取得できませんでした");
      return;
    }

    setApplications(result.applications || []);
    setMessage((result.applications || []).length ? "申請を確認してください。" : "まだ申請はありません。");
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
          const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;
          const name = profile?.character_name || profile?.discord_global_name || profile?.discord_username || "申請者";

          return (
            <article className="application-card" key={application.id}>
              <div>
                <strong>{name}</strong>
                <span>{application.requested_role} / {profile?.class_name || "-"} / 戦力 {(profile?.power || 0).toLocaleString("ja-JP")}</span>
                {application.message ? <p>{application.message}</p> : null}
              </div>
              <div className="application-actions">
                <span className={`status-pill ${application.status === "pending" ? "open" : "in_progress"}`}>{application.status}</span>
                {application.status === "pending" ? (
                  <>
                    <button className="icon-button" type="button" aria-label="承認" onClick={() => review(application.id, "approve")}>
                      <Check size={17} aria-hidden="true" />
                    </button>
                    <button className="icon-button" type="button" aria-label="却下" onClick={() => review(application.id, "reject")}>
                      <X size={17} aria-hidden="true" />
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}