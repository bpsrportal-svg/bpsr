import { z } from "zod";
import { vcModes } from "@/lib/constants";

export const recruitmentRoleKeys = ["DPS", "TANK", "HEALER"] as const;
export type RecruitmentRoleKey = (typeof recruitmentRoleKeys)[number];

const roleSlotSchema = z.object({
  required: z.coerce.number().int().min(0).max(12),
  accepted: z.coerce.number().int().min(0).max(12).default(0)
});

const requiredClassesSchema = z.object({
  DPS: z.array(z.string().min(1)).default([]),
  TANK: z.array(z.string().min(1)).default([]),
  HEALER: z.array(z.string().min(1)).default([])
});

export const recruitmentCreateSchema = z.object({
  contentId: z.coerce.number().int().positive(),
  modeId: z.coerce.number().int().positive(),
  title: z.string().trim().min(4, "タイトルは4文字以上で入力してください").max(80),
  conditions: z.string().trim().max(800).optional().default(""),
  vcMode: z.enum(vcModes),
  roleSlots: z.object({
    DPS: roleSlotSchema,
    TANK: roleSlotSchema,
    HEALER: roleSlotSchema
  }).refine(
    (slots) => slots.DPS.required + slots.TANK.required + slots.HEALER.required > 0,
    "募集人数を1人以上にしてください"
  ),
  requiredClasses: requiredClassesSchema.default({ DPS: [], TANK: [], HEALER: [] })
});

export const recruitmentApplySchema = z.object({
  requestedRole: z.enum(recruitmentRoleKeys),
  message: z.string().trim().max(500).optional().default("")
});

export type RecruitmentCreateInput = z.infer<typeof recruitmentCreateSchema>;
export type RecruitmentApplyInput = z.infer<typeof recruitmentApplySchema>;
