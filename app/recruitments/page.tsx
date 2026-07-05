import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";
import { auth } from "@/auth";
import { RecruitmentCard } from "@/components/recruitment-card";
import { SiteHeader } from "@/components/site-header";
import { getRecruitmentsForPage } from "@/lib/recruitment-queries";

type RecruitmentsPageProps = {
  searchParams?: Promise<{ content?: string }>;
};

export default async function RecruitmentsPage({ searchParams }: RecruitmentsPageProps) {
  const [resolvedSearchParams, session, recruitments] = await Promise.all([
    searchParams ?? Promise.resolve({ content: undefined }),
    auth(),
    getRecruitmentsForPage()
  ]);
  const selectedContent = typeof resolvedSearchParams.content === "string" ? resolvedSearchParams.content : "";
  const contentNames = Array.from(new Set(recruitments.map((item) => item.content).filter(Boolean)));
  const visibleRecruitments = selectedContent ? recruitments.filter((item) => item.content === selectedContent) : recruitments;

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn={Boolean(session?.user?.id)} />

      <section className="page-title-band simple-title-band">
        <h1>募集一覧</h1>
        <Link className="button primary" href="/recruitments/new"><Plus size={18} aria-hidden="true" />募集作成</Link>
      </section>

      <section className="search-toolbar" aria-label="募集一覧">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">キーワード</span>
          <input placeholder="タイトル、条件、コンテンツで検索" />
        </label>
        <select aria-label="VC"><option>VC指定なし</option><option>VCあり</option><option>VCなし</option></select>
        <button className="button secondary" type="button"><Filter size={17} aria-hidden="true" />絞り込み</button>
      </section>

      <section className="quick-filter-band left" aria-label="コンテンツ名フィルター">
        <Link className={!selectedContent ? "filter-chip active" : "filter-chip"} href="/recruitments"><Filter size={15} aria-hidden="true" />すべて</Link>
        {contentNames.map((name) => (
          <Link className={selectedContent === name ? "filter-chip active" : "filter-chip"} href={"/recruitments?content=" + encodeURIComponent(name)} key={name}>{name}</Link>
        ))}
      </section>

      <section className="recruitment-list wide">
        {visibleRecruitments.map((recruitment) => <RecruitmentCard key={recruitment.id} recruitment={recruitment} />)}
      </section>
    </main>
  );
}
