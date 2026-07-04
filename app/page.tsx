import Link from "next/link";
import { Activity, ArrowRight, Bell, CheckCircle2, Filter, RadioTower, Search, UsersRound } from "lucide-react";
import { auth } from "@/auth";
import { RecruitmentCard } from "@/components/recruitment-card";
import { SiteHeader } from "@/components/site-header";
import { getRecruitmentsForPage } from "@/lib/recruitment-queries";

export default async function Home() {
  const session = await auth();
  const recruitments = await getRecruitmentsForPage();
  const openRecruitments = recruitments.filter((item) => item.status === "open");

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn={Boolean(session?.user?.id)} />

      <section className="portal-hero">
        <div className="hero-copy">
          <p className="eyebrow">BPSRPortal</p>
          <h1>募集を探す時間を減らし、遊ぶ時間を増やす。</h1>
          <p className="lead">
            Discordと連携したゲームコミュニティポータルです。募集の検索、作成、申請、承認をWebで完結し、Discordには通知とVCを自動でつなぎます。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/recruitments">
              <Search size={18} aria-hidden="true" />
              募集を探す
            </Link>
            <Link className="button secondary" href="/recruitments/new">
              募集を作成
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <aside className="ops-panel" aria-label="ポータル稼働状況">
          <div className="ops-row strong">
            <span>稼働モード</span>
            <strong>Web中心</strong>
          </div>
          <div className="ops-row">
            <span><Activity size={16} aria-hidden="true" />募集中</span>
            <strong>{openRecruitments.length}</strong>
          </div>
          <div className="ops-row">
            <span><RadioTower size={16} aria-hidden="true" />Discord通知</span>
            <strong>Bot連携</strong>
          </div>
          <div className="ops-row">
            <span><CheckCircle2 size={16} aria-hidden="true" />所属チェック</span>
            <strong>ON</strong>
          </div>
        </aside>
      </section>

      <section className="quick-filter-band" aria-label="募集クイックフィルター">
        {[
          "すべて",
          "装備周回",
          "スコアアタック",
          "レイド",
          "VCあり",
          "初見可"
        ].map((item, index) => (
          <Link className={index === 0 ? "filter-chip active" : "filter-chip"} href="/recruitments" key={item}>
            {index === 0 ? <Filter size={15} aria-hidden="true" /> : null}
            {item}
          </Link>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="main-column">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Active Recruitment</p>
              <h2>おすすめ募集</h2>
            </div>
            <Link className="text-link" href="/recruitments">一覧を見る</Link>
          </div>
          <div className="recruitment-list">
            {recruitments.map((recruitment) => <RecruitmentCard key={recruitment.id} recruitment={recruitment} />)}
          </div>
        </div>

        <aside className="side-column">
          <section className="compact-panel">
            <div className="panel-title-row">
              <Bell size={18} aria-hidden="true" />
              <h2>Discord連携</h2>
            </div>
            <p>募集作成後、対象ロールへ通知し、人数が揃ったらVCとパーティチャンネルをBotが作成します。</p>
          </section>

          <section className="compact-panel">
            <div className="panel-title-row">
              <UsersRound size={18} aria-hidden="true" />
              <h2>次に実装する範囲</h2>
            </div>
            <ol className="roadmap-list">
              <li>募集テーブル作成</li>
              <li>募集作成フォーム保存</li>
              <li>申請と承認</li>
              <li>Bot通知ジョブ</li>
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}