import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { isMasterResource, masterConfigs, masterSchemas, type MasterPayload } from "@/lib/admin-masters";
import { createSupabaseAdmin } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ resource: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { resource } = await context.params;
  if (!isMasterResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const config = masterConfigs[resource];
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from(config.table).select(config.select).order(config.order, { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { resource } = await context.params;
  if (!isMasterResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const parsed = masterSchemas[resource].safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください", issues: parsed.error.flatten() }, { status: 400 });
  }

  const config = masterConfigs[resource];
  const supabase = createSupabaseAdmin();
  const payload = normalizePayload(parsed.data as MasterPayload);
  const { data, error } = await supabase.from(config.table).insert(payload).select(config.select).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ row: data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { resource } = await context.params;
  if (!isMasterResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const body = await request.json();
  const id = body.id ?? body.key;
  if (id === undefined || id === null || id === "") {
    return NextResponse.json({ error: "IDがありません" }, { status: 400 });
  }

  const parsed = masterSchemas[resource].safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください", issues: parsed.error.flatten() }, { status: 400 });
  }

  const config = masterConfigs[resource];
  const supabase = createSupabaseAdmin();
  const payload = normalizePayload(parsed.data as MasterPayload);
  const { data, error } = await supabase
    .from(config.table)
    .update(payload)
    .eq(config.idColumn, id)
    .select(config.select)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ row: data });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { resource } = await context.params;
  if (!isMasterResource(resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "IDがありません" }, { status: 400 });
  }

  const config = masterConfigs[resource];
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from(config.table)
    .update({ is_active: false })
    .eq(config.idColumn, id)
    .select(config.select)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ row: data });
}

function normalizePayload(payload: MasterPayload) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === "" ? null : value])
  );
}
