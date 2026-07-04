import Link from "next/link";
import { signIn, signOut } from "@/auth";
import { CircleUserRound, LogIn, LogOut, Plus, Search, ShieldCheck, UsersRound } from "lucide-react";

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="site-header">
      <Link className="brand-mark" href="/" aria-label="BPSRPortal ホーム">
        <span className="brand-symbol">BP</span>
        <span>
          <strong>BPSRPortal</strong>
          <small>Recruitment Hub</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label="メインナビゲーション">
        <Link href="/recruitments">
          <Search size={17} aria-hidden="true" />
          募集
        </Link>
        <Link href="/recruitments/new">
          <Plus size={17} aria-hidden="true" />
          作成
        </Link>
        <Link href="/players">
          <UsersRound size={17} aria-hidden="true" />
          プレイヤー
        </Link>
        <Link href="/profile">
          <CircleUserRound size={17} aria-hidden="true" />
          マイページ
        </Link>
        <Link href="/admin/users">
          <ShieldCheck size={17} aria-hidden="true" />
          管理
        </Link>
      </nav>

      <div className="auth-actions">
        {isLoggedIn ? (
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="icon-button" type="submit" aria-label="ログアウト">
              <LogOut size={18} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/profile" });
            }}
          >
            <button className="button primary compact" type="submit">
              <LogIn size={17} aria-hidden="true" />
              Discordログイン
            </button>
          </form>
        )}
      </div>
    </header>
  );
}