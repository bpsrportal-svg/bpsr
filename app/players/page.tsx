import { Search, ShieldCheck, ThumbsUp, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { players } from "@/lib/portal-sample-data";

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

export default async function PlayersPage() {
  const session = await auth();

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn={Boolean(session?.user?.id)} />

      <section className="page-title-band">
        <div>
          <p className="eyebrow">Players</p>
          <h1>プレイヤー検索</h1>
          <p className="lead">キャラクター名、クラス、戦力、Goodを見ながら、一緒に遊びたいプレイヤーを探せる画面にします。</p>
        </div>
      </section>

      <section className="search-toolbar player-search" aria-label="プレイヤー検索">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">キーワード</span>
          <input placeholder="キャラクター名、UID、クラスで検索" />
        </label>
        <select aria-label="クラス">
          <option>すべてのクラス</option>
          <option>狼弓</option>
          <option>光盾</option>
          <option>狂音</option>
        </select>
        <select aria-label="並び順">
          <option>Goodが多い順</option>
          <option>戦力が高い順</option>
          <option>DPSが高い順</option>
        </select>
      </section>

      <section className="player-grid">
        {players.map((player) => (
          <article className="player-card" key={player.id}>
            <div className="player-avatar" aria-hidden="true">
              <UserRound size={24} />
            </div>
            <div className="player-main">
              <div className="player-title-row">
                <div>
                  <h2>{player.name}</h2>
                  <p>UID {player.uid}</p>
                </div>
                <span className="class-chip">{player.className}</span>
              </div>
              <p className="card-condition">{player.comment}</p>
              <dl className="metric-grid">
                <div><dt>戦力</dt><dd>{formatNumber(player.power)}</dd></div>
                <div><dt>DPS</dt><dd>{formatNumber(player.dps)}</dd></div>
                <div><dt>Good</dt><dd><ThumbsUp size={15} aria-hidden="true" />{player.good}</dd></div>
              </dl>
              <div className="card-footerline">
                <span className="muted-inline"><ShieldCheck size={15} aria-hidden="true" />Discord認証済み</span>
                <button className="button secondary small" type="button">プロフィール</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}