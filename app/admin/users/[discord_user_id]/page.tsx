import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForbiddenError, formatLimitBreak, formatSeaWeaponLevel, requireAdmin } from "@/lib/authz";
import { IMAGINE_CATEGORIES, type ImagineCategory } from "@/lib/constants";
import { createSupabaseAdmin } from "@/lib/supabase";

type AdminUserDetailPageProps = {
  params: Promise<{
    discord_user_id: string;
  }>;
};

type ProfileDetail = {
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

type ImagineDetail = {
  category: ImagineCategory;
  name: string;
  sort_order: number;
  limit_break: number;
};

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  try {
    await requireAdmin("/admin/users");
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return (
        <main className="page-shell">
          <section className="form-section">
            <h1>403 Forbidden</h1>
            <p className="lead">管理者のみ閲覧できます。</p>
          </section>
        </main>
      );
    }

    throw error;
  }

  const { discord_user_id: discordUserId } = await params;
  const { profile, imagines } = await fetchUserDetail(discordUserId);

  if (!profile) {
    notFound();
  }

  const grouped = groupImagines(imagines);

  return (
    <main className="page-shell admin-shell">
      <header className="profile-header">
        <div>
          <p className="eyebrow">BPSR Admin</p>
          <h1>ユーザー詳細</h1>
          <p className="lead">閲覧専用です。</p>
        </div>
        <Link className="button secondary" href="/admin/users">
          一覧へ戻る
        </Link>
      </header>

      <section className="form-section admin-detail-profile">
        <div className="admin-user-identity large">
          {profile.discord_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={`https://cdn.discordapp.com/avatars/${profile.discord_user_id}/${profile.discord_avatar}.png?size=128`} />
          ) : (
            <span className="avatar-placeholder" />
          )}
          <div>
            <strong>{profile.discord_global_name || profile.discord_username || "Unknown"}</strong>
            <span>{profile.discord_username || "unknown"}</span>
            <code>{profile.discord_user_id}</code>
          </div>
        </div>
        <dl className="admin-detail-grid">
          <div>
            <dt>キャラクター名</dt>
            <dd>{profile.character_name || "未設定"}</dd>
          </div>
          <div>
            <dt>UID</dt>
            <dd>{profile.uid || "未設定"}</dd>
          </div>
          <div>
            <dt>クラス</dt>
            <dd>{profile.class_name}</dd>
          </div>
          <div>
            <dt>戦力</dt>
            <dd>{profile.power.toLocaleString()}</dd>
          </div>
          <div>
            <dt>3分合計DPS</dt>
            <dd>{profile.dps_3min.toLocaleString()}</dd>
          </div>
          <div>
            <dt>海武器</dt>
            <dd>{formatSeaWeaponLevel(profile.sea_weapon_level)}</dd>
          </div>
          <div>
            <dt>最終更新日時</dt>
            <dd>{formatDate(profile.profile_updated_at)}</dd>
          </div>
        </dl>
      </section>

      {IMAGINE_CATEGORIES.map((category) => (
        <section className="form-section" key={category}>
          <h2>{category === "EVENT" ? "イベント" : category}</h2>
          <div className="admin-imagine-list">
            {grouped[category].map((imagine) => (
              <div className="admin-imagine-row" key={`${category}-${imagine.name}`}>
                <span>{imagine.name}</span>
                <strong>{formatLimitBreak(imagine.limit_break)}</strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

async function fetchUserDetail(discordUserId: string) {
  const supabase = createSupabaseAdmin();
  const [{ data: profile, error: profileError }, { data: imagines, error: imaginesError }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "discord_user_id, discord_username, discord_global_name, discord_avatar, character_name, uid, class_name, power, dps_3min, sea_weapon_level, profile_updated_at"
      )
      .eq("discord_user_id", discordUserId)
      .maybeSingle(),
    supabase
      .from("user_imagines")
      .select("limit_break, imagine_masters(category, name, sort_order)")
      .eq("discord_user_id", discordUserId)
  ]);

  if (profileError || imaginesError) {
    throw new Error(profileError?.message ?? imaginesError?.message);
  }

  return {
    profile: profile as ProfileDetail | null,
    imagines: (imagines ?? []).map((row) => {
      const master = Array.isArray(row.imagine_masters) ? row.imagine_masters[0] : row.imagine_masters;

      return {
        category: master?.category as ImagineCategory,
        name: master?.name ?? "",
        sort_order: master?.sort_order ?? 0,
        limit_break: row.limit_break
      };
    }) as ImagineDetail[]
  };
}

function groupImagines(imagines: ImagineDetail[]): Record<ImagineCategory, ImagineDetail[]> {
  const grouped: Record<ImagineCategory, ImagineDetail[]> = {
    S1: [],
    S2: [],
    S3: [],
    EVENT: []
  };

  for (const imagine of imagines) {
    grouped[imagine.category]?.push(imagine);
  }

  for (const category of IMAGINE_CATEGORIES) {
    grouped[category].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  return grouped;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo"
  }).format(new Date(value));
}
