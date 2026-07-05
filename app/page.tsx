import Link from "next/link";
import { ArrowRight, Filter, Search } from "lucide-react";
import { auth } from "@/auth";
import { RecruitmentCard } from "@/components/recruitment-card";
import { SiteHeader } from "@/components/site-header";
import { getRecruitmentsForPage } from "@/lib/recruitment-queries";

type HomeProps = {
  searchParams?: Promise<{ content?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [resolvedSearchParams, session, recruitments] = await Promise.all([
    searchParams ?? Promise.resolve({ content: undefined }),
    auth(),
    getRecruitmentsForPage()
  ]);
  const openRecruitments = recruitments.filter((item) => item.status === "open");
  const contentNames = Array.from(new Set(recruitments.map((item) => item.content).filter(Boolean)));
  const selectedContent = typeof resolvedSearchParams.content === "string" ? resolvedSearchParams.content : "";
  const visibleRecruitments = selectedContent ? recruitments.filter((item) => item.content === selectedContent) : recruitments;

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn={Boolean(session?.user?.id)} />

      <section className="portal-hero">
        <div className="hero-copy">
          <p className="eyebrow">BPSRPortal</p>
          <h1>募集を探す時間を減らし、遊ぶ時間を増やす。</h1>
          <p className="lead">Discordと連携したゲームコミュニティポータルです。募集の検索、作成、申請、承認をWeb中心で扱い、通知だけをDiscordへつなぎます。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/recruitments"><Search size={18} aria-hidden="true" />募集を探す</Link>
            <Link className="button secondary" href="/recruitments/new">募集を作成<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>

        <aside className="ops-panel" aria-label="募集状況">
          <div className="ops-row strong">
            <span>募集中</span>
            <strong>{openRecruitments.length}</strong>
          </div>
        </aside>
      </section>

      <section className="quick-filter-band" aria-label="コンテンツ名フィルター">
        <Link className={!selectedContent ? "filter-chip active" : "filter-chip"} href="/"><Filter size={15} aria-hidden="true" />すべて</Link>
        {contentNames.map((name) => (
          <Link className={selectedContent === name ? "filter-chip active" : "filter-chip"} href={"/?content=" + encodeURIComponent(name)} key={name}>{name}</Link>
        ))}
      </section>

      <section className="dashboard-grid single-column">
        <div className="main-column">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Active Recruitment</p>
              <h2>おすすめ募集</h2>
            </div>
            <Link className="text-link" href="/recruitments">一覧を見る</Link>
          </div>
          <div className="recruitment-list">
            {visibleRecruitments.map((recruitment) => <RecruitmentCard key={recruitment.id} recruitment={recruitment} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
