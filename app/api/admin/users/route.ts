import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { createSupabaseAdmin } from "@/lib/supabase";

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi();

  if (admin instanceof NextResponse) {
    return admin;
  }

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const className = params.get("class_name")?.trim();
  const minPower = parsePositiveInteger(params.get("min_power"));
  const minDps3min = parsePositiveInteger(params.get("min_dps_3min"));
  const limit = Math.min(parsePositiveInteger(params.get("limit")) ?? 50, MAX_LIMIT);
  const offset = parsePositiveInteger(params.get("offset")) ?? 0;

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("profiles")
    .select(
      "discord_user_id, discord_username, discord_global_name, discord_avatar, character_name, uid, class_name, power, dps_3min, sea_weapon_level, profile_updated_at",
      { count: "exact" }
    )
    .order("profile_updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    const escaped = escapeIlike(q);
    query = query.or(
      `discord_username.ilike.%${escaped}%,discord_global_name.ilike.%${escaped}%,character_name.ilike.%${escaped}%,uid.ilike.%${escaped}%,discord_user_id.ilike.%${escaped}%`
    );
  }

  if (className) {
    query = query.eq("class_name", className);
  }

  if (minPower !== null) {
    query = query.gte("power", minPower);
  }

  if (minDps3min !== null) {
    query = query.gte("dps_3min", minDps3min);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [], total: count ?? 0 });
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function escapeIlike(value: string): string {
  return value.replace(/[%,]/g, "");
}
