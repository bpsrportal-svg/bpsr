import { auth } from "@/auth";
import { RecruitmentCreateForm } from "@/components/recruitment-create-form";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdmin } from "@/lib/supabase";

type ContentMaster = { id: number; category: string; name: string };
type ModeMaster = { id: number; content_id: number; name: string };
type ClassMaster = { id: number; name: string; role_key: "DPS" | "TANK" | "HEALER" | "MULTI" };

async function getMasters(): Promise<{ contents: ContentMaster[]; modes: ModeMaster[]; classes: ClassMaster[] }> {
  try {
    const supabase = createSupabaseAdmin();
    const [contentsResult, modesResult, classesResult] = await Promise.all([
      supabase.from("content_masters").select("id, category, name").eq("is_active", true).order("sort_order"),
      supabase.from("content_mode_masters").select("id, content_id, name").eq("is_active", true).order("sort_order"),
      supabase.from("class_masters").select("id, name, role_key").eq("is_active", true).order("sort_order")
    ]);

    return {
      contents: contentsResult.data ?? [],
      modes: modesResult.data ?? [],
      classes: (classesResult.data ?? []) as ClassMaster[]
    };
  } catch {
    return { contents: [], modes: [], classes: [] };
  }
}

export default async function NewRecruitmentPage() {
  const [session, masters] = await Promise.all([auth(), getMasters()]);

  return (
    <main className="app-shell">
      <SiteHeader isLoggedIn={Boolean(session?.user?.id)} />

      <section className="page-title-band simple-title-band">
        <h1>募集作成</h1>
      </section>

      <RecruitmentCreateForm contents={masters.contents} modes={masters.modes} classes={masters.classes} />
    </main>
  );
}
