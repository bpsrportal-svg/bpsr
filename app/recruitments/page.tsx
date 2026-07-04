import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";
import { auth } from "@/auth";
import { RecruitmentCard } from "@/components/recruitment-card";
import { SiteHeader } from "@/components/site-header";
import { contentFilters } from "@/lib/portal-sample-data";
import { getRecruitmentsForPage } from "@/lib/recruitment-queries";

export default async function RecruitmentsPage() {
  const [session, recruitments] = await Promise.all([auth(), getRecruitmentsForPage()]);

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn={Boolean(session?.user?.id)} />

      <section className="page-title-band">
        <div>
          <p className="eyebrow">Recruitments</p>
          <h1>募集一覧</h1>
          <p className="lead">条件に合う募集を素早く探せるよう、状態・コンテンツ・VC・必要ロールで絞り込める画面にします。</p>
        </div>
        <Link className="button primary" href="/recruitments/new">
          <Plus size={18} aria-hidden="true" />
          募集作成
        </Link>
      </section>

      <section className="search-toolbar" aria-label="募集検索">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">キーワード</span>
          <input placeholder="タイトル、条件、コンテンツで検索" />
        </label>
        <select aria-label="状態">
          <option>募集中</option>
          <option>編成中</option>
          <option>すべて</option>
        </select>
        <select aria-label="VC">
          <option>VC指定なし</option>
          <option>VCあり</option>
          <option>VCなし</option>
        </select>
        <button className="button secondary" type="button">
          <Filter size={17} aria-hidden="true" />
          絞り込み
        </button>
      </section>

      <section className="quick-filter-band left" aria-label="コンテンツフィルター">
        {contentFilters.map((item, index) => (
          <button className={index === 0 ? "filter-chip active" : "filter-chip"} type="button" key={item}>{item}</button>
        ))}
      </section>

      <section className="recruitment-list wide">
        {recruitments.map((recruitment) => <RecruitmentCard key={recruitment.id} recruitment={recruitment} />)}
      </section>
    </main>
  );
}