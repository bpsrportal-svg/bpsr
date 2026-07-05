import Link from "next/link";
import { ShieldAlert, UsersRound } from "lucide-react";
import { AdminMasterConsole } from "@/components/admin-master-console";
import { SiteHeader } from "@/components/site-header";
import { masterConfigs, masterResources, type MasterResource } from "@/lib/admin-masters";
import { AdminForbiddenError, requireAdmin } from "@/lib/authz";
import { createSupabaseAdmin } from "@/lib/supabase";

type MasterRow = Record<string, string | number | boolean | null | undefined>;

export default async function AdminPage() {
  try {
    await requireAdmin("/admin");
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return <ForbiddenView />;
    }
    throw error;
  }

  const initialRows = await fetchMasterRows();

  return (
    <main className="app-shell admin-console-shell">
      <SiteHeader isLoggedIn />

      <section className="page-title-band admin-title-band">
        <div>
          <p className="eyebrow">BPSRPortal Admin</p>
          <h1>管理</h1>
          <p className="lead">募集、プロフィール、Bot通知で使うマスターデータをここから更新します。</p>
        </div>
        <Link className="button secondary" href="/admin/users">
          <UsersRound size={18} aria-hidden="true" />
          登録ユーザー一覧
        </Link>
      </section>

      <AdminMasterConsole initialRows={initialRows} />
    </main>
  );
}

async function fetchMasterRows() {
  const supabase = createSupabaseAdmin();
  const entries = await Promise.all(
    masterResources.map(async (resource) => {
      const config = masterConfigs[resource];
      const { data, error } = await supabase.from(config.table).select(config.select).order(config.order, { ascending: true });
      if (error) {
        throw new Error(`${resource}: ${error.message}`);
      }
      return [resource, data ?? []] as const;
    })
  );

  return Object.fromEntries(entries) as unknown as Record<MasterResource, MasterRow[]>;
}

function ForbiddenView() {
  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn />
      <section className="form-section forbidden-panel">
        <ShieldAlert size={28} aria-hidden="true" />
        <h1>403 Forbidden</h1>
        <p className="lead">管理者のみ閲覧できます。</p>
      </section>
    </main>
  );
}
