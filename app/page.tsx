import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";
import { auth } from "@/auth";
import { RecruitmentCard } from "@/components/recruitment-card";
import { SiteHeader } from "@/components/site-header";
import { getRecruitmentsForPage } from "@/lib/recruitment-queries";

type HomeProps = {
  searchParams?: Promise<{ content?: string }>;
};

const labels = {
  hero: "BPSRPortal",
  recruitmentStatus: "\u52df\u96c6\u4e2d",
  recruitments: "\u52df\u96c6",
  create: "\u4f5c\u6210",
  filter: "\u30b3\u30f3\u30c6\u30f3\u30c4\u540d\u30d5\u30a3\u30eb\u30bf\u30fc",
  all: "\u3059\u3079\u3066",
  active: "Active Recruitment",
  recommended: "\u304a\u3059\u3059\u3081\u52df\u96c6",
  viewAll: "\u4e00\u89a7\u3092\u898b\u308b"
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

      <section className="portal-hero portal-hero-simple" aria-label={labels.hero}>
        <div className="hero-copy brand-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-brand-logo" src="/star-resonance-mark.png" alt="BLUE PROTOCOL STAR RESONANCE" />
          <div className="hero-command-row">
            <span className="hero-status-chip"><span>{labels.recruitmentStatus}</span><strong>{openRecruitments.length}</strong></span>
            <div className="hero-actions compact-actions">
              <Link className="button primary" href="/recruitments"><Search size={18} aria-hidden="true" />{labels.recruitments}</Link>
              <Link className="button secondary" href="/recruitments/new"><Plus size={18} aria-hidden="true" />{labels.create}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="quick-filter-band" aria-label={labels.filter}>
        <Link className={!selectedContent ? "filter-chip active" : "filter-chip"} href="/"><Filter size={15} aria-hidden="true" />{labels.all}</Link>
        {contentNames.map((name) => (
          <Link className={selectedContent === name ? "filter-chip active" : "filter-chip"} href={"/?content=" + encodeURIComponent(name)} key={name}>{name}</Link>
        ))}
      </section>

      <section className="dashboard-grid single-column">
        <div className="main-column">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{labels.active}</p>
              <h2>{labels.recommended}</h2>
            </div>
            <Link className="text-link" href="/recruitments">{labels.viewAll}</Link>
          </div>
          <div className="recruitment-list">
            {visibleRecruitments.map((recruitment) => <RecruitmentCard key={recruitment.id} recruitment={recruitment} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
