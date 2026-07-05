import { z } from "zod";
import { IMAGINE_CATEGORIES, roleKeys } from "@/lib/constants";

export const masterResources = ["imagines", "contents", "modes", "classes", "roles"] as const;
export type MasterResource = (typeof masterResources)[number];

export type MasterPayload = Record<string, string | number | boolean | null>;

export const masterResourceLabels: Record<MasterResource, string> = {
  imagines: "イマジン管理",
  contents: "コンテンツ管理",
  modes: "モード管理",
  classes: "クラス管理",
  roles: "ロール管理"
};

export const masterResourceDescriptions: Record<MasterResource, string> = {
  imagines: "プロフィールで選択するイマジン名、カテゴリ、アイコンを管理します。",
  contents: "募集で選択するコンテンツ名、分類、説明、アイコンを管理します。",
  modes: "コンテンツごとのモードを管理します。",
  classes: "プロフィールと募集条件で使うクラスとロール分類を管理します。",
  roles: "募集人数で使うロール表記を管理します。"
};

export const masterSchemas = {
  imagines: z.object({
    category: z.enum(IMAGINE_CATEGORIES),
    name: z.string().trim().min(1).max(80),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
    icon_url: z.string().trim().url().or(z.literal("")).nullable().optional(),
    is_active: z.coerce.boolean().default(true)
  }),
  contents: z.object({
    category: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
    icon_url: z.string().trim().url().or(z.literal("")).nullable().optional(),
    is_active: z.coerce.boolean().default(true)
  }),
  modes: z.object({
    content_id: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(80),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
    is_active: z.coerce.boolean().default(true)
  }),
  classes: z.object({
    name: z.string().trim().min(1).max(40),
    role_key: z.enum(roleKeys),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
    icon_url: z.string().trim().url().or(z.literal("")).nullable().optional(),
    is_active: z.coerce.boolean().default(true)
  }),
  roles: z.object({
    key: z.enum(["DPS", "TANK", "HEALER"]),
    label: z.string().trim().min(1).max(40),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
    is_active: z.coerce.boolean().default(true)
  })
} satisfies Record<MasterResource, z.ZodTypeAny>;

export const masterConfigs = {
  imagines: {
    table: "imagine_masters",
    idColumn: "id",
    select: "id, category, name, sort_order, icon_url, is_active, updated_at",
    order: "sort_order"
  },
  contents: {
    table: "content_masters",
    idColumn: "id",
    select: "id, category, name, description, sort_order, icon_url, is_active, updated_at",
    order: "sort_order"
  },
  modes: {
    table: "content_mode_masters",
    idColumn: "id",
    select: "id, content_id, name, sort_order, is_active, updated_at",
    order: "sort_order"
  },
  classes: {
    table: "class_masters",
    idColumn: "id",
    select: "id, name, role_key, sort_order, icon_url, is_active, updated_at",
    order: "sort_order"
  },
  roles: {
    table: "role_masters",
    idColumn: "key",
    select: "key, label, sort_order, is_active",
    order: "sort_order"
  }
} satisfies Record<MasterResource, { table: string; idColumn: string; select: string; order: string }>;

export function isMasterResource(value: string): value is MasterResource {
  return (masterResources as readonly string[]).includes(value);
}
