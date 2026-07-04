import Link from "next/link";
import { Clock3, Headphones, Shield, Swords, UserRoundCheck } from "lucide-react";
import type { Recruitment } from "@/lib/portal-sample-data";

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function statusLabel(status: Recruitment["status"]) {
  if (status === "in_progress") return "編成中";
  if (status === "closed") return "終了";
  return "募集中";
}

export function RecruitmentCard({ recruitment }: { recruitment: Recruitment }) {
  return (
    <article className="recruitment-card">
      <div className="card-topline">
        <span className={`status-pill ${recruitment.status}`}>{statusLabel(recruitment.status)}</span>
        <span className="muted-inline">
          <Clock3 size={15} aria-hidden="true" />
          {recruitment.updatedAt}
        </span>
      </div>

      <div className="card-title-row">
        <div>
          <p className="card-kicker">{recruitment.content} / {recruitment.mode}</p>
          <h2>{recruitment.title}</h2>
        </div>
        <Link className="button secondary small" href={`/recruitments/${recruitment.id}`}>
          詳細
        </Link>
      </div>

      <p className="card-condition">{recruitment.condition}</p>

      <div className="slot-grid" aria-label="募集人数">
        <span><Swords size={15} aria-hidden="true" />DPS {recruitment.slots.dps[0]}/{recruitment.slots.dps[1]}</span>
        <span><Shield size={15} aria-hidden="true" />タンク {recruitment.slots.tank[0]}/{recruitment.slots.tank[1]}</span>
        <span><UserRoundCheck size={15} aria-hidden="true" />ヒーラー {recruitment.slots.healer[0]}/{recruitment.slots.healer[1]}</span>
      </div>

      <div className="card-footerline">
        <span className="host-chip">{recruitment.host.name} / {recruitment.host.className} / 戦力 {formatNumber(recruitment.host.power)}</span>
        <span className="muted-inline"><Headphones size={15} aria-hidden="true" />{recruitment.vc}</span>
      </div>

      <div className="tag-row">
        {recruitment.tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    </article>
  );
}