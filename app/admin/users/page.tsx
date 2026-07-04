import Link from "next/link";
import { AdminForbiddenError, formatSeaWeaponLevel, requireAdmin } from "@/lib/authz";
import { CLASS_OPTIONS } from "@/lib/constants";
import { createSupabaseAdmin } from "@/lib/supabase";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type AdminUsersPageProps = {
  searchParams: SearchParams;
};

type ProfileRow = {
  discord_user_id: string;
  discord_username: string | null;
  discord_global_name: string | null;
  discord_avatar: string | null;
  character_name: string | null;
  uid: string | null;
  class_name: string;
  power: number;
  dps_3min: number;
  sea_weapon_level: number | null;
  profile_updated_at: string;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  try {
    await requireAdmin("/admin/users");
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return <ForbiddenView />;
    }

    throw error;
  }

  const params = await searchParams;
  const filters = {
    q: getParam(params.q),
    class_name: getParam(params.class_name),
    min_power: getParam(params.min_power),
    min_dps_3min: getParam(params.min_dps_3min)
  };

  const { users, total } = await fetchUsers(filters);

  return (
    <main className="page-shell admin-shell">
      <header className="profile-header">
        <div>
          <p className="eyebrow">BPSR Admin</p>
          <h1>登録ユーザー一覧</h1>
          <p className="lead">最終更新が新しい順に表示しています。</p>
        </div>
        <span className="admin-count">{total} 件</span>
      </header>

      <section className="form-section">
        <form className="admin-filters">
          <label>
            検索
            <input name="q" placeholder="ユーザー名 / キャラ名 / UID / Discord ID" defaultValue={filters.q} />
          </label>
          <label>
            クラス
            <select name="class_name" defaultValue={filters.class_name}>
              <option value="">すべて</option>
              {CLASS_OPTIONS.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </label>
          <label>
            戦力 最小値
            <input name="min_power" type="number" min={0} defaultValue={filters.min_power} />
          </label>
          <label>
            DPS 最小値
            <input name="min_dps_3min" type="number" min={0} defaultValue={filters.min_dps_3min} />
          </label>
          <div className="admin-filter-actions">
            <button className="button primary" type="submit">
              絞り込み
            </button>
            <Link className="button secondary" href="/admin/users">
              クリア
            </Link>
          </div>
        </form>
      </section>

      <section className="admin-table-section">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ユーザー</th>
              <th>Discord ID</th>
              <th>キャラクター名</th>
              <th>UID</th>
              <th>クラス</th>
              <th>戦力</th>
              <th>3分DPS</th>
              <th>海武器</th>
              <th>最終更新</th>
              <th>詳細</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.discord_user_id}>
                <td>
                  <UserIdentity user={user} />
                </td>
                <td>
                  <code>{user.discord_user_id}</code>
                </td>
                <td>{user.character_name || "未設定"}</td>
                <td>{user.uid || "未設定"}</td>
                <td>{user.class_name}</td>
                <td>{user.power.toLocaleString()}</td>
                <td>{user.dps_3min.toLocaleString()}</td>
                <td>{formatSeaWeaponLevel(user.sea_weapon_level)}</td>
                <td>{formatDate(user.profile_updated_at)}</td>
                <td>
                  <Link className="button secondary small" href={`/admin/users/${user.discord_user_id}`}>
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="admin-card-list">
          {users.map((user) => (
            <article className="admin-user-card" key={user.discord_user_id}>
              <UserIdentity user={user} />
              <dl>
                <div>
                  <dt>キャラ名</dt>
                  <dd>{user.character_name || "未設定"}</dd>
                </div>
                <div>
                  <dt>UID</dt>
                  <dd>{user.uid || "未設定"}</dd>
                </div>
                <div>
                  <dt>クラス</dt>
                  <dd>{user.class_name}</dd>
                </div>
                <div>
                  <dt>戦力</dt>
                  <dd>{user.power.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>DPS</dt>
                  <dd>{user.dps_3min.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>最終更新</dt>
                  <dd>{formatDate(user.profile_updated_at)}</dd>
                </div>
              </dl>
              <Link className="button secondary" href={`/admin/users/${user.discord_user_id}`}>
                詳細
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ForbiddenView() {
  return (
    <main className="page-shell">
      <section className="form-section">
        <h1>403 Forbidden</h1>
        <p className="lead">管理者のみ閲覧できます。</p>
      </section>
    </main>
  );
}

function UserIdentity({ user }: { user: ProfileRow }) {
  return (
    <div className="admin-user-identity">
      {user.discord_avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={`https://cdn.discordapp.com/avatars/${user.discord_user_id}/${user.discord_avatar}.png?size=80`} />
      ) : (
        <span className="avatar-placeholder" />
      )}
      <div>
        <strong>{user.discord_global_name || user.discord_username || "Unknown"}</strong>
        <span>{user.discord_username || "unknown"}</span>
      </div>
    </div>
  );
}

async function fetchUsers(filters: { q: string; class_name: string; min_power: string; min_dps_3min: string }) {
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("profiles")
    .select(
      "discord_user_id, discord_username, discord_global_name, discord_avatar, character_name, uid, class_name, power, dps_3min, sea_weapon_level, profile_updated_at",
      { count: "exact" }
    )
    .order("profile_updated_at", { ascending: false })
    .limit(100);

  if (filters.q) {
    const escaped = filters.q.replace(/[%,]/g, "");
    query = query.or(
      `discord_username.ilike.%${escaped}%,discord_global_name.ilike.%${escaped}%,character_name.ilike.%${escaped}%,uid.ilike.%${escaped}%,discord_user_id.ilike.%${escaped}%`
    );
  }

  if (filters.class_name) {
    query = query.eq("class_name", filters.class_name);
  }

  if (filters.min_power) {
    query = query.gte("power", Number(filters.min_power));
  }

  if (filters.min_dps_3min) {
    query = query.gte("dps_3min", Number(filters.min_dps_3min));
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return { users: (data ?? []) as ProfileRow[], total: count ?? 0 };
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo"
  }).format(new Date(value));
}
