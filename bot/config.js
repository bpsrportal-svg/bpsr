require('dotenv').config();

const CONTENTS = [
  { category: 'ダンジョン', name: '衰亡の深淵', modes: ['装備周回', 'スコアアタック'], roleEnv: 'CONTENT_ROLE_DECAY_ABYSS_ID' },
  { category: 'ダンジョン', name: 'ロックスネークの巣', modes: ['装備周回', 'スコアアタック'], roleEnv: 'CONTENT_ROLE_ROCKSNAKE_NEST_ID' },
  { category: 'ダンジョン', name: '荒魂の祭殿', modes: ['装備周回', 'スコアアタック'], roleEnv: 'CONTENT_ROLE_ARATAMA_TEMPLE_ID' },
  { category: 'ダンジョン', name: '音無き都', modes: ['装備周回', 'スコアアタック'], roleEnv: 'CONTENT_ROLE_SILENT_CITY_ID' },
  { category: 'ダンジョン', name: '光亡き牢', modes: ['装備周回', 'スコアアタック'], roleEnv: 'CONTENT_ROLE_LIGHTLESS_PRISON_ID' },
  { category: 'ダンジョン', name: '幻華流月の野', modes: ['装備周回', 'スコアアタック'], roleEnv: 'CONTENT_ROLE_GENKA_RYUGETSU_FIELD_ID' },
  { category: 'レグディニス遺跡', name: 'レグディニス遺跡', modes: ['通常'], roleEnv: 'CONTENT_ROLE_REGDINIS_RUINS_ID' },
  { category: 'レイド', name: 'ホーンゴート・花と刃', modes: ['イージー', 'ハード', 'ナイトメア'], roleEnv: 'CONTENT_ROLE_HORNGOAT_FLOWER_BLADE_ID' },
  { category: 'レイド', name: '幻花の残骸', modes: ['イージー', 'ハード', 'ナイトメア'], roleEnv: 'CONTENT_ROLE_PHANTOM_FLOWER_REMAINS_ID' },
  { category: 'レイド', name: '蝕花の残影', modes: ['イージー', 'ハード', 'ナイトメア'], roleEnv: 'CONTENT_ROLE_ECLIPSE_FLOWER_SHADOW_ID' },
];

const ROLE_LABELS = {
  DPS: 'DPS',
  TANK: 'タンク',
  HEALER: 'ヒーラー',
};

const ROLE_ORDER = ['DPS', 'TANK', 'HEALER'];

const CLASS_ROLE_MAP = {
  DPS: ['狼弓', '鷹弓', '月影', '雷刃', '氷牙', '霜天', '烈風', '乱風', '威咲', '狂音'],
  TANK: ['剛身', '剛守', '光盾', '光砕'],
  HEALER: ['森癒', '威咲', '狂音', '響奏'],
};

const DEFAULT_ROLE_SLOTS = {
  DPS: { required: 3, accepted: 0 },
  TANK: { required: 1, accepted: 0 },
  HEALER: { required: 1, accepted: 0 },
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function getClientId() {
  return process.env.DISCORD_CLIENT_ID || process.env.AUTH_DISCORD_ID || requiredEnv('DISCORD_CLIENT_ID');
}

function getContentChoice(value) {
  const [category, name, mode] = value.split('|');
  const content = CONTENTS.find((item) => item.category === category && item.name === name);
  if (!content || !content.modes.includes(mode)) return null;
  return { ...content, mode };
}

function contentChoices() {
  return CONTENTS.flatMap((content) => content.modes.map((mode) => ({
    label: `${content.category} / ${content.name} / ${mode}`.slice(0, 100),
    value: `${content.category}|${content.name}|${mode}`.slice(0, 100),
  })));
}

function getContentRoleId(choice) {
  if (!choice || !choice.roleEnv) return null;
  return process.env[choice.roleEnv] || null;
}

function canApplyAs(className, role) {
  return CLASS_ROLE_MAP[role]?.includes(className || '') || false;
}

function botConfig() {
  return {
    token: requiredEnv('DISCORD_BOT_TOKEN'),
    guildId: requiredEnv('DISCORD_GUILD_ID'),
    clientId: getClientId(),
    recruitmentChannelId: process.env.RECRUITMENT_CHANNEL_ID || '',
    operationsRoleId: process.env.OPERATIONS_ROLE_ID || '',
    proofCategoryId: process.env.PROOF_CATEGORY_ID || '',
    proofCategoryName: process.env.PROOF_CATEGORY_NAME || '証明チャンネル',
    applicationCategoryId: process.env.APPLICATION_CATEGORY_ID || '',
    applicationCategoryName: process.env.APPLICATION_CATEGORY_NAME || '募集申請',
    partyCategoryId: process.env.PARTY_CATEGORY_ID || '',
    partyCategoryName: process.env.PARTY_CATEGORY_NAME || 'パーティ',
    publicVcCategoryId: process.env.PUBLIC_VC_CATEGORY_ID || process.env.PARTY_CATEGORY_ID || '',
  };
}

module.exports = {
  CONTENTS,
  ROLE_LABELS,
  ROLE_ORDER,
  CLASS_ROLE_MAP,
  DEFAULT_ROLE_SLOTS,
  botConfig,
  canApplyAs,
  contentChoices,
  getContentChoice,
  getContentRoleId,
};