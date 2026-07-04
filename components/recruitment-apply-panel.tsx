"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type ApplyPanelProps = {
  recruitmentId: string;
  disabled?: boolean;
};

export function RecruitmentApplyPanel({ recruitmentId, disabled }: ApplyPanelProps) {
  const [requestedRole, setRequestedRole] = useState<"DPS" | "TANK" | "HEALER">("DPS");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("申請するロールを選んでください。");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setStatus("申請中...");

    const response = await fetch(`/api/recruitments/${recruitmentId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedRole, message })
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error || "申請できませんでした");
      setIsSubmitting(false);
      return;
    }

    setStatus("申請しました。募集主の承認をお待ちください。");
    setIsSubmitting(false);
  }

  return (
    <section className="compact-panel apply-panel">
      <h2>この募集に申請</h2>
      <label>
        申請ロール
        <select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value as typeof requestedRole)} disabled={disabled || isSubmitting}>
          <option value="DPS">DPS</option>
          <option value="TANK">タンク</option>
          <option value="HEALER">ヒーラー</option>
        </select>
      </label>
      <label>
        ひとこと
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="例: 初見ですが予習済みです。" disabled={disabled || isSubmitting} />
      </label>
      <p className={status.includes("できません") ? "message error" : "message"}>{status}</p>
      <button className="button primary" type="button" onClick={submit} disabled={disabled || isSubmitting}>
        <Send size={17} aria-hidden="true" />
        申請する
      </button>
    </section>
  );
}