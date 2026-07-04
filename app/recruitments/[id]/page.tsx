import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, CheckCircle2, Headphones, Send, Shield, Swords, UserRoundCheck } from "lucide-react";
import { auth } from "@/auth";
import { RecruitmentApplicationsPanel } from "@/components/recruitment-applications-panel";
import { RecruitmentApplyPanel } from "@/components/recruitment-apply-panel";
import { RecruitmentCard } from "@/components/recruitment-card";
import { SiteHeader } from "@/components/site-header";
import { getRecruitmentForPage } from "@/lib/recruitment-queries";

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

export default async function RecruitmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const recruitment = await getRecruitmentForPage(id);

  if (!recruitment) notFound();

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn={Boolean(session?.user?.id)} />

      <section className="page-title-band detail-title-band">
        <div>
          <Link className="text-link back-link" href="/recruitments">
            <ArrowLeft size={16} aria-hidden="true" />
            募集一覧へ戻る
          </Link>
          <p className="eyebrow">Recruitment Detail</p>
          <h1>{recruitment.title}</h1>
          <p className="lead">申請、承認、パーティ編成をこの詳細ページに集約する想定です。</p>
        </div>
        <button className="button primary" type="button" disabled>
          <Send size={17} aria-hidden="true" />
          申請する
        </button>
      </section>

      <section className="detail-layout">
        <div className="main-column">
          <RecruitmentCard recruitment={recruitment} />

          <section className="compact-panel detail-panel">
            <div className="panel-title-row">
              <CheckCircle2 size={18} aria-hidden="true" />
              <h2>募集条件</h2>
            </div>
            <dl className="detail-definition-grid">
              <div><dt>コンテンツ</dt><dd>{recruitment.content}</dd></div>
              <div><dt>モード</dt><dd>{recruitment.mode}</dd></div>
              <div><dt>VC</dt><dd>{recruitment.vc}</dd></div>
              <div><dt>募集主</dt><dd>{recruitment.host.name} / {recruitment.host.className}</dd></div>
              <div className="span-2"><dt>条件</dt><dd>{recruitment.condition}</dd></div>
            </dl>
          </section>

          <section className="compact-panel detail-panel">
            <div className="panel-title-row">
              <Swords size={18} aria-hidden="true" />
              <h2>ロール枠</h2>
            </div>
            <div className="slot-grid detail-slots">
              <span><Swords size={15} aria-hidden="true" />DPS {recruitment.slots.dps[0]}/{recruitment.slots.dps[1]}</span>
              <span><Shield size={15} aria-hidden="true" />タンク {recruitment.slots.tank[0]}/{recruitment.slots.tank[1]}</span>
              <span><UserRoundCheck size={15} aria-hidden="true" />ヒーラー {recruitment.slots.healer[0]}/{recruitment.slots.healer[1]}</span>
            </div>
          </section>
        </div>

        <aside className="side-column">
          <RecruitmentApplyPanel recruitmentId={recruitment.id} disabled={recruitment.status !== "open"} />
          <RecruitmentApplicationsPanel recruitmentId={recruitment.id} />

          <section className="compact-panel">
            <div className="panel-title-row">
              <Bell size={18} aria-hidden="true" />
              <h2>Discord通知</h2>
            </div>
            <p>この募集が保存されると、BotがDiscordへ通知し、Web詳細URLへ誘導します。</p>
          </section>

          <section className="compact-panel">
            <div className="panel-title-row">
              <Headphones size={18} aria-hidden="true" />
              <h2>パーティ作成</h2>
            </div>
            <p>承認人数が揃った時点で、Botが必要なVCとパーティチャンネルを作成します。</p>
          </section>

          <section className="compact-panel">
            <h2>募集主プロフィール</h2>
            <dl className="detail-definition-grid single">
              <div><dt>名前</dt><dd>{recruitment.host.name}</dd></div>
              <div><dt>クラス</dt><dd>{recruitment.host.className}</dd></div>
              <div><dt>戦力</dt><dd>{formatNumber(recruitment.host.power)}</dd></div>
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
}