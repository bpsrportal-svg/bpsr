const { EmbedBuilder } = require('discord.js');
const { ROLE_LABELS, ROLE_ORDER } = require('./config');

const IMAGINE_CATEGORY_ORDER = ['S1', 'S2', 'S3', 'EVENT'];

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('ja-JP') : String(value);
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatLimitBreak(limitBreak) {
  return `${limitBreak}凸`;
}

function formatSeaWeaponLevel(level) {
  if (level === null || level === undefined || level === '') return '-';
  return `Lv.${level}`;
}

function displayName(profile) {
  return profile.character_name || profile.discord_global_name || profile.discord_username || profile.discord_user_id;
}

function discordAvatarUrl(profile, size = 128) {
  const avatar = profile.discord_avatar;
  if (!avatar) return null;
  if (String(avatar).startsWith('http://') || String(avatar).startsWith('https://')) return avatar;
  if (!profile.discord_user_id) return null;
  const extension = String(avatar).startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${profile.discord_user_id}/${avatar}.${extension}?size=${size}`;
}

function profileFields(profile) {
  return [
    { name: 'Discord', value: `${profile.discord_global_name || '-'} / ${profile.discord_username || '-'}`, inline: false },
    { name: 'Discord ID', value: profile.discord_user_id, inline: false },
    { name: 'キャラクター名', value: profile.character_name || '-', inline: true },
    { name: 'UID', value: profile.uid || '-', inline: true },
    { name: 'クラス', value: profile.class_name || '-', inline: true },
    { name: '戦力', value: formatNumber(profile.power), inline: true },
    { name: '3分合計DPS', value: formatNumber(profile.dps_3min), inline: true },
    { name: '海武器', value: formatSeaWeaponLevel(profile.sea_weapon_level), inline: true },
    { name: '最終更新', value: formatDate(profile.profile_updated_at || profile.updated_at), inline: false },
  ];
}

function categoryLabel(category) {
  return category === 'EVENT' ? 'イベント' : category;
}

function imagineText(profile) {
  const owned = (profile.imagines || []).filter((imagine) => Number(imagine.limit_break) >= 0);
  if (!owned.length) return '所持イマジンなし';
  const byCategory = owned.reduce((acc, imagine) => {
    acc[imagine.category] ||= [];
    acc[imagine.category].push(`${imagine.name}: ${formatLimitBreak(imagine.limit_break)}`);
    return acc;
  }, {});
  return IMAGINE_CATEGORY_ORDER
    .filter((category) => byCategory[category]?.length)
    .map((category) => `**${categoryLabel(category)}**\n${byCategory[category].join('\n')}`)
    .join('\n\n');
}

function profileEmbed(profile, title = 'プロフィール') {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x31d0aa)
    .addFields(profileFields(profile))
    .addFields({ name: 'イマジン', value: imagineText(profile).slice(0, 1024), inline: false });

  const avatarUrl = discordAvatarUrl(profile);
  if (avatarUrl) embed.setThumbnail(avatarUrl);
  return embed;
}

function statusLabel(status) {
  if (status === 'in_progress') return '🟡 パーティ編成中';
  if (status === 'closed') return '🔴 募集終了';
  return '🟢 募集中';
}

function slotText(slots) {
  return ROLE_ORDER.map((role) => {
    const slot = slots[role] || { required: 0, accepted: 0 };
    return `${ROLE_LABELS[role]} ${slot.accepted || 0}/${slot.required || 0}`;
  }).join('\n');
}

function recruitmentEmbed(recruitment, hostProfile) {
  const embed = new EmbedBuilder()
    .setTitle(recruitment.title)
    .setColor(recruitment.status === 'closed' ? 0xd94b4b : recruitment.status === 'in_progress' ? 0xe4bc46 : 0x31d0aa)
    .setDescription(statusLabel(recruitment.status))
    .addFields(
      { name: 'コンテンツ', value: `${recruitment.content_category} / ${recruitment.content_name}${recruitment.content_mode ? ` / ${recruitment.content_mode}` : ''}`, inline: false },
      { name: '条件', value: recruitment.conditions || '-', inline: false },
      { name: 'VC', value: recruitment.vc_mode || 'なし', inline: true },
      { name: '募集人数', value: slotText(recruitment.role_slots), inline: true },
      { name: '募集主', value: `${displayName(hostProfile)} / ${hostProfile.class_name || '-'} / 戦力 ${formatNumber(hostProfile.power)} / DPS ${formatNumber(hostProfile.dps_3min)}`, inline: false },
      { name: '募集主イマジン', value: imagineText(hostProfile).slice(0, 1024), inline: false },
    );

  if (recruitment.status === 'closed') {
    embed.addFields({ name: '終了日時', value: formatDate(recruitment.closed_at || new Date().toISOString()), inline: false });
  }
  const avatarUrl = discordAvatarUrl(hostProfile);
  if (avatarUrl) embed.setThumbnail(avatarUrl);
  return embed;
}

module.exports = {
  categoryLabel,
  discordAvatarUrl,
  displayName,
  formatDate,
  formatLimitBreak,
  formatNumber,
  formatSeaWeaponLevel,
  imagineText,
  profileEmbed,
  recruitmentEmbed,
  statusLabel,
  slotText,
};