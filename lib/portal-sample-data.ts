export type RecruitmentStatus = "open" | "in_progress" | "closed";

export type Recruitment = {
  id: string;
  title: string;
  content: string;
  mode: string;
  condition: string;
  vc: "なし" | "あり" | "あり（プライベート）";
  status: RecruitmentStatus;
  updatedAt: string;
  host: {
    name: string;
    className: string;
    power: number;
  };
  slots: {
    dps: [number, number];
    tank: [number, number];
    healer: [number, number];
  };
  tags: string[];
};

export type Player = {
  id: string;
  name: string;
  uid: string;
  className: string;
  power: number;
  dps: number;
  good: number;
  comment: string;
};

export const recruitments: Recruitment[] = [
  {
    id: "rec-001",
    title: "衰亡の深淵 装備周回 5周予定",
    content: "衰亡の深淵",
    mode: "装備周回",
    condition: "戦力110,000以上。初見可、道中安定重視。",
    vc: "あり",
    status: "open",
    updatedAt: "3分前",
    host: { name: "もろびと", className: "狼弓", power: 128000 },
    slots: { dps: [2, 3], tank: [0, 1], healer: [1, 1] },
    tags: ["周回", "VCあり", "初見可"]
  },
  {
    id: "rec-002",
    title: "幻花の残骸 ハード 練習寄り",
    content: "幻花の残骸",
    mode: "ハード",
    condition: "ギミック確認しながら。失敗しても続けられる方。",
    vc: "あり（プライベート）",
    status: "open",
    updatedAt: "12分前",
    host: { name: "管理人", className: "光盾", power: 121500 },
    slots: { dps: [1, 3], tank: [1, 1], healer: [0, 1] },
    tags: ["練習", "高難度", "承認制"]
  },
  {
    id: "rec-003",
    title: "ロックスネークの巣 スコアアタック",
    content: "ロックスネークの巣",
    mode: "スコアアタック",
    condition: "火力相談あり。構成を見て出発します。",
    vc: "なし",
    status: "in_progress",
    updatedAt: "28分前",
    host: { name: "BPSR隊員", className: "狂音", power: 132400 },
    slots: { dps: [3, 3], tank: [1, 1], healer: [1, 1] },
    tags: ["編成中", "スコア"]
  }
];

export const players: Player[] = [
  {
    id: "p-001",
    name: "もろびと",
    uid: "123456789",
    className: "狼弓",
    power: 128000,
    dps: 52000000,
    good: 24,
    comment: "周回と高難度どちらも参加します。"
  },
  {
    id: "p-002",
    name: "管理人",
    uid: "151295707",
    className: "光盾",
    power: 121500,
    dps: 31000000,
    good: 18,
    comment: "安定進行重視。VC対応できます。"
  },
  {
    id: "p-003",
    name: "BPSR隊員",
    uid: "998877665",
    className: "狂音",
    power: 132400,
    dps: 61000000,
    good: 31,
    comment: "DPS/ヒーラーどちらでも申請可能です。"
  }
];

export const contentFilters = ["すべて", "衰亡の深淵", "ロックスネークの巣", "幻花の残骸", "レイド", "スコアアタック"];