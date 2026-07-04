import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseAdmin();

  const [contentsResult, modesResult, classesResult, rolesResult] = await Promise.all([
    supabase.from("content_masters").select("id, category, name, sort_order, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("content_mode_masters").select("id, content_id, name, sort_order, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("class_masters").select("id, name, role_key, sort_order, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("role_masters").select("key, label, sort_order, is_active").eq("is_active", true).order("sort_order")
  ]);

  const error = contentsResult.error ?? modesResult.error ?? classesResult.error ?? rolesResult.error;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contents: contentsResult.data ?? [],
    modes: modesResult.data ?? [],
    classes: classesResult.data ?? [],
    roles: rolesResult.data ?? []
  });
}