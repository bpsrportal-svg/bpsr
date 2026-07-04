export const CLASS_OPTIONS = [
  "狼弓",
  "鷹弓",
  "月影",
  "雷刃",
  "氷牙",
  "霜天",
  "烈風",
  "乱風",
  "剛身",
  "剛守",
  "光盾",
  "光砕",
  "森癒",
  "威咲",
  "狂音",
  "響奏"
] as const;

export const SEA_WEAPON_OPTIONS = [
  { label: "なし", value: "" },
  { label: "100Lv.", value: "100" },
  { label: "140Lv.", value: "140" },
  { label: "160Lv.", value: "160" },
  { label: "180Lv.", value: "180" },
  { label: "220Lv.", value: "220" },
  { label: "240Lv.", value: "240" },
  { label: "260Lv.", value: "260" }
] as const;

export const LIMIT_BREAK_OPTIONS = [
  { label: "未所持", value: -1 },
  { label: "0凸", value: 0 },
  { label: "1凸", value: 1 },
  { label: "2凸", value: 2 },
  { label: "3凸", value: 3 },
  { label: "4凸", value: 4 },
  { label: "5凸", value: 5 }
] as const;

export const IMAGINE_CATEGORIES = ["S1", "S2", "S3", "EVENT"] as const;

export type ImagineCategory = (typeof IMAGINE_CATEGORIES)[number];
