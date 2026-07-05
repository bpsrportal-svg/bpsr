import Link from "next/link";
import { Bell, BookOpen, Database, ImageIcon, ListChecks, Megaphone, ScrollText, ShieldAlert, Sparkles, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/authz";

const adminItems = [
  { title: "登録ユーザー一覧", description: "プロフィール登録済みユーザーを確認します。", href: "/admin/users", icon: UsersRound, ready: true },
  { title: "イマジン管理", description: "イマジン名、カテゴリ、アイコンなどを管理します。", icon: Sparkles, ready: false },
  { title: "コンテンツ管理", description: "ダンジョン、レイド、モード分類を管理します。", icon: Database, ready: false },
  { title: "クラス管理", description: "クラス名とロール分類を管理します。", icon: ListChecks, ready: false },
  { title: "ロール管理", description: "DPS、タンク、ヒーラーの設定を管理します。", icon: BookOpen, ready: false },
  { title: "アイコン管理", description: "Webで利用する画像やアイコンを管理します。", icon: ImageIcon, ready: false },
  { title: "募集管理", description: "作成済み募集の状態を確認します。", icon: Megaphone, ready: false },
  { title: "問題報告", description: "ユーザーからの報告を確認します。", icon: ShieldAlert, ready: false },
  { title: "ログ", description: "Bot通知や管理操作の履歴を確認します。", icon: ScrollText, ready: false },
  { title: "お知らせ", description: "ポータル内のお知らせを管理します。", icon: Bell, ready: false }
];

export default async function AdminPage() {
  await requireAdmin("/admin");

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn />

      <section className="page-title-band simple-title-band">
        <h1>管理</h1>
      </section>

      <section className="admin-menu-grid" aria-label="管理メニュー">
        {adminItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className="admin-menu-icon"><Icon size={20} aria-hidden="true" /></div>
              <div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <span className={item.ready ? "status-pill open" : "status-pill"}>{item.ready ? "開く" : "準備中"}</span>
            </>
          );

          return item.href ? (
            <Link className="admin-menu-card" href={item.href} key={item.title}>{content}</Link>
          ) : (
            <div className="admin-menu-card disabled" key={item.title}>{content}</div>
          );
        })}
      </section>
    </main>
  );
}
