import { z } from "zod";
import { CLASS_OPTIONS } from "@/lib/constants";

const limitBreakSchema = z.object({
  imagineId: z.number().int().positive(),
  limitBreak: z.number().int().min(-1).max(5)
});

const uidSchema = z
  .string()
  .trim()
  .regex(/^\d*$/, "UIDは数字のみで入力してください")
  .max(32)
  .optional()
  .default("");

export const profileInputSchema = z.object({
  characterName: z.string().trim().max(80).optional().default(""),
  uid: uidSchema,
  className: z.enum(CLASS_OPTIONS),
  power: z.number().int().min(0),
  dps3min: z.number().int().min(0),
  seaWeaponLevel: z.number().int().nullable(),
  imagines: z.array(limitBreakSchema)
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
