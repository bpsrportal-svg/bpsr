import Link from "next/link";
import { signIn, signOut } from "@/auth";
import { CircleUserRound, LogIn, LogOut, Plus, Search, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const labels = {
  home: "BPSRPortal \u30db\u30fc\u30e0",
  nav: "\u30e1\u30a4\u30f3\u30ca\u30d3\u30b2\u30fc\u30b7\u30e7\u30f3",
  recruitments: "\u52df\u96c6",
  create: "\u4f5c\u6210",
  myPage: "\u30de\u30a4\u30da\u30fc\u30b8",
  admin: "\u7ba1\u7406",
  logout: "\u30ed\u30b0\u30a2\u30a6\u30c8",
  discordLogin: "Discord\u30ed\u30b0\u30a4\u30f3"
};

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="site-header">
      <Link className="brand-mark" href="/" aria-label={labels.home}>
        <span className="brand-symbol">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bpsr-symbol.png" alt="" />
        </span>
        <span>
          <strong>BPSRPortal</strong>
          <small>Recruitment Hub</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label={labels.nav}>
        <Link href="/recruitments"><Search size={17} aria-hidden="true" />{labels.recruitments}</Link>
        <Link href="/recruitments/new"><Plus size={17} aria-hidden="true" />{labels.create}</Link>
        <Link href="/profile"><CircleUserRound size={17} aria-hidden="true" />{labels.myPage}</Link>
        <Link href="/admin"><ShieldCheck size={17} aria-hidden="true" />{labels.admin}</Link>
      </nav>

      <div className="auth-actions">
        <ThemeToggle />
        {isLoggedIn ? (
          <form action={async () => { "use server"; await signOut(); }}>
            <button className="icon-button" type="submit" aria-label={labels.logout}><LogOut size={18} aria-hidden="true" /></button>
          </form>
        ) : (
          <form action={async () => { "use server"; await signIn("discord", { redirectTo: "/" }); }}>
            <button className="button primary compact" type="submit"><LogIn size={17} aria-hidden="true" />{labels.discordLogin}</button>
          </form>
        )}
      </div>
    </header>
  );
}
