require('dotenv').config();
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const {
  ROLE_LABELS,
  ROLE_ORDER,
  botConfig,
  canApplyAs,
  contentChoices,
  getContentChoice,
  getContentRoleId,
} = require('./config');
const db = require('./db');
const { displayName, profileEmbed, recruitmentEmbed } = require('./render');
const { startBotJobWorker } = require('./job-worker');

const config = botConfig();
const sessions = new Map();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
function appUrl(path = '/') {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://bpsr-dun.vercel.app';
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function sanitizeChannelName(value) {
  return String(value || 'user')
    .normalize('NFKC')
    .replace(/[\\/#?%*:|"<>]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 90) || 'user';
}

function canOperate(interaction, recruitment) {
  return interaction.user.id === recruitment.owner_discord_user_id || Boolean(config.operationsRoleId && interaction.member.roles.cache.has(config.operationsRoleId));
}

function basePermissionOverwrites(guild, extra = []) {
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
  ];
  if (config.operationsRoleId) {
    overwrites.push({ id: config.operationsRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }
  return overwrites.concat(extra);
}

async function findOrCreateCategory(guild, id, name) {
  if (id) {
    const channel = await guild.channels.fetch(id).catch(() => null);
    if (channel) return channel;
  }
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === name);
  if (existing) return existing;
  return guild.channels.create({ name, type: ChannelType.GuildCategory });
}

function applicationButtons(recruitment) {
  const disabled = recruitment.status !== 'open';
  const row = new ActionRowBuilder();
  for (const role of ROLE_ORDER) {
    const slot = recruitment.role_slots[role] || { required: 0, accepted: 0 };
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`recruit:apply:${recruitment.id}:${role}`)
        .setLabel(`${ROLE_LABELS[role]}で申請`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || slot.required <= 0 || slot.accepted >= slot.required),
    );
  }
  return [row];
}

async function updatePublicRecruitmentMessage(recruitmentId) {
  const recruitment = await db.getRecruitment(recruitmentId);
  if (!recruitment?.public_message_channel_id || !recruitment.public_message_id) return;
  const host = await db.getProfile(recruitment.owner_discord_user_id);
  const channel = await client.channels.fetch(recruitment.public_message_channel_id).catch(() => null);
  const message = channel ? await channel.messages.fetch(recruitment.public_message_id).catch(() => null) : null;
  if (message && host) await message.edit({ embeds: [recruitmentEmbed(recruitment, host)], components: applicationButtons(recruitment) });
}

async function ensureProofChannel(guild, member, profile) {
  const saved = await db.getProofChannel(member.id);
  if (saved) {
    const channel = await guild.channels.fetch(saved.proof_channel_id).catch(() => null);
    if (channel) return channel;
  }
  if (!profile.character_name || !profile.uid) throw new Error('プロフィールのキャラクター名とUIDを先に登録してください。');

  const category = await findOrCreateCategory(guild, config.proofCategoryId, config.proofCategoryName);
  const name = sanitizeChannelName(`${profile.character_name}-${profile.uid}`);
  const existing = guild.channels.cache.find((channel) => channel.parentId === category.id && channel.name === name);
  if (existing) {
    await db.upsertProofChannel(member.id, existing.id);
    return existing;
  }
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: basePermissionOverwrites(guild, [
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ]),
  });
  await db.upsertProofChannel(member.id, channel.id);
  return channel;
}

async function handleProfile(interaction) {
  const profile = await db.getProfile(interaction.user.id);
  if (!profile) return interaction.reply({ content: 'プロフィールが未登録です。Webサイトでプロフィールを登録してください。', ephemeral: true });
  return interaction.reply({ embeds: [profileEmbed(profile)], ephemeral: true });
}

async function handleProofCreate(interaction) {
  const profile = await db.getProfile(interaction.user.id);
  if (!profile) return interaction.reply({ content: 'プロフィールが未登録です。Webサイトでプロフィールを登録してください。', ephemeral: true });
  const channel = await ensureProofChannel(interaction.guild, interaction.member, profile);
  return interaction.reply({ content: `証明チャンネルを用意しました: ${channel}`, ephemeral: true });
}


async function handleRecruitCreateLink(interaction) {
  const profile = await db.getProfile(interaction.user.id);
  if (!profile) return interaction.reply({ content: `プロフィールを先に登録してください。\n${appUrl('/profile')}`, ephemeral: true });
  return interaction.reply({ content: `募集作成はWebで行います。\n${appUrl('/recruitments/new')}`, ephemeral: true });
}
async function startRecruitWizard(interaction) {
  const profile = await db.getProfile(interaction.user.id);
  if (!profile) return interaction.reply({ content: 'プロフィールが未登録です。Webサイトでプロフィールを登録してください。', ephemeral: true });
  const sessionId = `${interaction.user.id}-${Date.now()}`;
  sessions.set(sessionId, { ownerId: interaction.user.id });
  const select = new StringSelectMenuBuilder()
    .setCustomId(`wizard:content:${sessionId}`)
    .setPlaceholder('コンテンツを選択')
    .addOptions(contentChoices().map((choice) => new StringSelectMenuOptionBuilder().setLabel(choice.label).setValue(choice.value)));
  return interaction.reply({ content: '募集するコンテンツを選択してください。', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
}

async function handleWizardContent(interaction, sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== interaction.user.id) return interaction.reply({ content: 'この募集作成セッションは利用できません。もう一度 /recruit-create から始めてください。', ephemeral: true });
  const choice = getContentChoice(interaction.values[0]);
  if (!choice) return interaction.reply({ content: 'コンテンツ選択を読み取れませんでした。', ephemeral: true });
  session.content = choice;
  sessions.set(sessionId, session);

  const modal = new ModalBuilder().setCustomId(`wizard:modal:${sessionId}`).setTitle('募集内容');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('タイトル').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('conditions').setLabel('条件').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('companions').setLabel('同行者').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)),
  );
  return interaction.showModal(modal);
}

async function handleWizardModal(interaction, sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== interaction.user.id) return interaction.reply({ content: 'この募集作成セッションは利用できません。もう一度 /recruit-create から始めてください。', ephemeral: true });
  session.title = interaction.fields.getTextInputValue('title');
  session.conditions = interaction.fields.getTextInputValue('conditions');
  session.companions = interaction.fields.getTextInputValue('companions');
  sessions.set(sessionId, session);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`wizard:vc:${sessionId}`)
    .setPlaceholder('VC設定')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('なし').setValue('なし'),
      new StringSelectMenuOptionBuilder().setLabel('あり').setValue('あり'),
      new StringSelectMenuOptionBuilder().setLabel('あり（プライベート）').setValue('あり（プライベート）'),
    );
  return interaction.reply({ content: 'VC設定を選択してください。', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
}

function slotSelect(sessionId, role, label, current) {
  return new StringSelectMenuBuilder()
    .setCustomId(`wizard:slot:${sessionId}:${role}`)
    .setPlaceholder(`${label}: ${current}人`)
    .addOptions(Array.from({ length: 7 }, (_, count) => new StringSelectMenuOptionBuilder().setLabel(`${count}人`).setValue(String(count)).setDefault(count === current)));
}

async function showSlotStep(interaction, sessionId, edit) {
  const session = sessions.get(sessionId);
  const slots = session.slots || { DPS: 3, TANK: 1, HEALER: 1 };
  const rows = [
    new ActionRowBuilder().addComponents(slotSelect(sessionId, 'DPS', 'DPS', slots.DPS)),
    new ActionRowBuilder().addComponents(slotSelect(sessionId, 'TANK', 'タンク', slots.TANK)),
    new ActionRowBuilder().addComponents(slotSelect(sessionId, 'HEALER', 'ヒーラー', slots.HEALER)),
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`wizard:start:${sessionId}`).setLabel('募集開始').setStyle(ButtonStyle.Success)),
  ];
  const payload = { content: '募集人数を指定して、募集開始を押してください。', components: rows, ephemeral: true };
  return edit ? interaction.update(payload) : interaction.reply(payload);
}

async function handleWizardVc(interaction, sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== interaction.user.id) return interaction.reply({ content: 'この募集作成セッションは利用できません。もう一度 /recruit-create から始めてください。', ephemeral: true });
  session.vcMode = interaction.values[0];
  session.slots = { DPS: 3, TANK: 1, HEALER: 1 };
  sessions.set(sessionId, session);
  return showSlotStep(interaction, sessionId, true);
}

async function handleWizardSlot(interaction, sessionId, role) {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== interaction.user.id) return interaction.reply({ content: 'この募集作成セッションは利用できません。もう一度 /recruit-create から始めてください。', ephemeral: true });
  session.slots ||= { DPS: 3, TANK: 1, HEALER: 1 };
  session.slots[role] = Number(interaction.values[0]);
  sessions.set(sessionId, session);
  return showSlotStep(interaction, sessionId, true);
}

async function createApplicationChannel(guild, recruitment, ownerId) {
  const category = await findOrCreateCategory(guild, config.applicationCategoryId, config.applicationCategoryName);
  return guild.channels.create({
    name: sanitizeChannelName(`申請一覧-${recruitment.id}`),
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: basePermissionOverwrites(guild, [
      { id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ]),
  });
}

async function handleWizardStart(interaction, sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== interaction.user.id) return interaction.reply({ content: 'この募集作成セッションは利用できません。もう一度 /recruit-create から始めてください。', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const host = await db.getProfile(interaction.user.id);
  const recruitment = await db.createRecruitment({
    owner_discord_user_id: interaction.user.id,
    title: session.title,
    content_category: session.content.category,
    content_name: session.content.name,
    content_mode: session.content.mode,
    conditions: session.conditions,
    companions: session.companions,
    vc_mode: session.vcMode,
    role_slots: {
      DPS: { required: session.slots?.DPS ?? 3, accepted: 0 },
      TANK: { required: session.slots?.TANK ?? 1, accepted: 0 },
      HEALER: { required: session.slots?.HEALER ?? 1, accepted: 0 },
    },
  });
  const applicationChannel = await createApplicationChannel(interaction.guild, recruitment, interaction.user.id);
  let updated = await db.updateRecruitment(recruitment.id, { application_channel_id: applicationChannel.id });
  const targetChannel = config.recruitmentChannelId ? await interaction.guild.channels.fetch(config.recruitmentChannelId).catch(() => null) : interaction.channel;
  if (!targetChannel) throw new Error('募集投稿先チャンネルが見つかりません。RECRUITMENT_CHANNEL_IDを確認してください。');
  const roleId = getContentRoleId(session.content);
  const message = await targetChannel.send({
    content: `${roleId ? `<@&${roleId}>\n` : ''}新しい募集が開始されました。`,
    embeds: [recruitmentEmbed(updated, host)],
    components: applicationButtons(updated),
  });
  updated = await db.updateRecruitment(recruitment.id, { public_message_channel_id: targetChannel.id, public_message_id: message.id });
  sessions.delete(sessionId);
  return interaction.editReply(`募集を開始しました: ${message.url}\n申請一覧: ${applicationChannel}`);
}

async function handleApply(interaction, recruitmentId, role) {
  await interaction.deferReply({ ephemeral: true });
  const recruitment = await db.getRecruitment(recruitmentId);
  if (!recruitment || recruitment.status !== 'open') return interaction.editReply('この募集は申請できません。');
  if (interaction.user.id === recruitment.owner_discord_user_id) return interaction.editReply('募集主は自分の募集に申請できません。');
  const slot = recruitment.role_slots[role];
  if (!slot || slot.accepted >= slot.required) return interaction.editReply('このロールは募集人数に達しています。');
  const profile = await db.getProfile(interaction.user.id);
  if (!profile) return interaction.editReply('プロフィールが未登録です。Webサイトでプロフィールを登録してください。');
  if (!canApplyAs(profile.class_name, role)) return interaction.editReply(`あなたのクラス「${profile.class_name || '-'}」では${ROLE_LABELS[role]}に申請できません。`);
  const application = await db.createOrGetApplication(recruitment.id, interaction.user.id, role);
  if (application.status === 'approved') return interaction.editReply('この申請はすでに承認済みです。');
  const channel = await interaction.guild.channels.fetch(recruitment.application_channel_id).catch(() => null);
  if (!channel) return interaction.editReply('申請一覧チャンネルが見つかりません。募集主に連絡してください。');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app:approve:${application.id}`).setLabel('承認').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`app:reject:${application.id}`).setLabel('却下').setStyle(ButtonStyle.Danger),
  );
  const message = await channel.send({ content: `${ROLE_LABELS[role]}申請`, embeds: [profileEmbed(profile, `申請者プロフィール: ${ROLE_LABELS[role]}`)], components: [row] });
  await db.updateApplication(application.id, { application_message_id: message.id, status: 'pending' });
  return interaction.editReply('申請しました。募集主の承認をお待ちください。');
}

function isFull(recruitment) {
  return ROLE_ORDER.every((role) => {
    const slot = recruitment.role_slots[role] || { required: 0, accepted: 0 };
    return slot.accepted >= slot.required;
  });
}

async function createPartyChannelsAndPermissions(guild, recruitment) {
  const members = await db.getPartyMembers(recruitment.id);
  const profiles = new Map();
  for (const member of members) profiles.set(member.discord_user_id, await db.getProfile(member.discord_user_id));
  const hostProfile = profiles.get(recruitment.owner_discord_user_id);
  const category = await findOrCreateCategory(guild, config.partyCategoryId, config.partyCategoryName);
  const memberOverwrites = members.map((member) => ({ id: member.discord_user_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect] }));
  const partyChannel = await guild.channels.create({
    name: sanitizeChannelName(`🔒${displayName(hostProfile)}のパーティ`),
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: basePermissionOverwrites(guild, memberOverwrites),
  });
  let vcChannelId = recruitment.vc_channel_id;
  if (recruitment.vc_mode === 'あり' || recruitment.vc_mode === 'あり（プライベート）') {
    const isPrivate = recruitment.vc_mode === 'あり（プライベート）';
    const vc = await guild.channels.create({
      name: sanitizeChannelName(`${displayName(hostProfile)}のVC`),
      type: ChannelType.GuildVoice,
      parent: config.publicVcCategoryId || category.id,
      permissionOverwrites: isPrivate ? basePermissionOverwrites(guild, memberOverwrites) : undefined,
    });
    vcChannelId = vc.id;
  }
  const order = { HOST: 0, DPS: 1, TANK: 2, HEALER: 3 };
  const sorted = [...members].sort((a, b) => order[a.party_role] - order[b.party_role]);
  await partyChannel.send({ content: 'パーティプロフィール', embeds: sorted.map((member) => profileEmbed(profiles.get(member.discord_user_id), `${member.party_role}: ${displayName(profiles.get(member.discord_user_id))}`)).slice(0, 10) });
  const endMessage = await partyChannel.send({
    content: '━━━━━━━━━━━━━━\n\nコンテンツ終了\n\n━━━━━━━━━━━━━━',
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`party:end:${recruitment.id}`).setLabel('コンテンツ終了').setStyle(ButtonStyle.Danger))],
  });
  await endMessage.pin().catch(() => null);

  const proofChannels = await db.getProofChannels(members.map((member) => member.discord_user_id));
  for (const proof of proofChannels) {
    const channel = await guild.channels.fetch(proof.proof_channel_id).catch(() => null);
    if (!channel) continue;
    for (const viewer of members) {
      if (viewer.discord_user_id === proof.discord_user_id) continue;
      await channel.permissionOverwrites.edit(viewer.discord_user_id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => null);
      await db.recordProofPermission(recruitment.id, proof.discord_user_id, viewer.discord_user_id);
    }
  }
  return db.updateRecruitment(recruitment.id, { party_channel_id: partyChannel.id, vc_channel_id: vcChannelId });
}

async function handleApprove(interaction, applicationId) {
  await interaction.deferReply({ ephemeral: true });
  const application = await db.getApplication(applicationId);
  if (!application || application.status !== 'pending') return interaction.editReply('この申請は処理済みです。');
  let recruitment = await db.getRecruitment(application.recruitment_id);
  if (!recruitment || recruitment.status !== 'open') return interaction.editReply('この募集は承認できません。');
  if (!canOperate(interaction, recruitment)) return interaction.editReply('承認できるのは募集主または運営のみです。');
  const slot = recruitment.role_slots[application.requested_role];
  if (slot.accepted >= slot.required) return interaction.editReply('このロールはすでに募集人数に達しています。');
  slot.accepted += 1;
  await db.updateApplication(application.id, { status: 'approved' });
  await db.addPartyMember(recruitment.id, application.applicant_discord_user_id, application.requested_role);
  recruitment = await db.updateRecruitment(recruitment.id, { role_slots: recruitment.role_slots });
  if (isFull(recruitment)) {
    recruitment = await db.updateRecruitment(recruitment.id, { status: 'in_progress' });
    recruitment = await createPartyChannelsAndPermissions(interaction.guild, recruitment);
  }
  await updatePublicRecruitmentMessage(recruitment.id);
  await interaction.message.edit({ components: [] }).catch(() => null);
  return interaction.editReply(isFull(recruitment) ? '承認しました。必要人数が集まったためパーティチャンネルを作成しました。' : '承認しました。');
}

async function handleReject(interaction, applicationId) {
  await interaction.deferReply({ ephemeral: true });
  const application = await db.getApplication(applicationId);
  if (!application || application.status !== 'pending') return interaction.editReply('この申請は処理済みです。');
  const recruitment = await db.getRecruitment(application.recruitment_id);
  if (!canOperate(interaction, recruitment)) return interaction.editReply('却下できるのは募集主または運営のみです。');
  await db.updateApplication(application.id, { status: 'rejected' });
  await interaction.message.delete().catch(() => null);
  return interaction.editReply('申請を却下しました。');
}

async function cleanupProofPermissions(guild, recruitmentId) {
  const records = await db.getProofPermissions(recruitmentId);
  for (const record of records) {
    const proof = await db.getProofChannel(record.proof_owner_discord_user_id);
    const channel = proof ? await guild.channels.fetch(proof.proof_channel_id).catch(() => null) : null;
    if (channel) await channel.permissionOverwrites.delete(record.viewer_discord_user_id).catch(() => null);
  }
  await db.clearProofPermissions(recruitmentId);
}

async function handlePartyEnd(interaction, recruitmentId) {
  const recruitment = await db.getRecruitment(recruitmentId);
  if (!recruitment || interaction.user.id !== recruitment.owner_discord_user_id) return interaction.reply({ content: 'この操作は募集主のみ実行できます。', ephemeral: true });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`party:end-confirm:${recruitmentId}`).setLabel('終了する').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`party:end-cancel:${recruitmentId}`).setLabel('キャンセル').setStyle(ButtonStyle.Secondary),
  );
  return interaction.reply({
    content: '⚠ コンテンツを終了しますか？\n\nこの操作を実行すると\n募集終了\nパーティチャンネル削除\nVC削除\n証明チャンネル相互閲覧権限削除\nこの操作は元に戻せません',
    components: [row],
    ephemeral: true,
  });
}

async function handlePartyEndConfirm(interaction, recruitmentId) {
  await interaction.deferReply({ ephemeral: true });
  let recruitment = await db.getRecruitment(recruitmentId);
  if (!recruitment || interaction.user.id !== recruitment.owner_discord_user_id) return interaction.editReply('この操作は募集主のみ実行できます。');
  recruitment = await db.updateRecruitment(recruitment.id, { status: 'closed', closed_at: new Date().toISOString() });
  await updatePublicRecruitmentMessage(recruitment.id);
  await cleanupProofPermissions(interaction.guild, recruitment.id);
  if (recruitment.vc_channel_id) {
    const vc = await interaction.guild.channels.fetch(recruitment.vc_channel_id).catch(() => null);
    await vc?.delete('Recruitment closed').catch(() => null);
  }
  await interaction.editReply('募集を終了しました。パーティチャンネルを削除します。');
  const party = recruitment.party_channel_id ? await interaction.guild.channels.fetch(recruitment.party_channel_id).catch(() => null) : interaction.channel;
  setTimeout(() => party?.delete('Recruitment closed').catch(() => null), 2500);
}

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'profile') return handleProfile(interaction);
      if (interaction.commandName === 'proof-create') return handleProofCreate(interaction);
      if (interaction.commandName === 'recruit-create') return handleRecruitCreateLink(interaction);
    }
    if (interaction.isStringSelectMenu()) {
      const [scope, action, sessionId, role] = interaction.customId.split(':');
      if (scope === 'wizard' && action === 'content') return handleWizardContent(interaction, sessionId);
      if (scope === 'wizard' && action === 'vc') return handleWizardVc(interaction, sessionId);
      if (scope === 'wizard' && action === 'slot') return handleWizardSlot(interaction, sessionId, role);
    }
    if (interaction.isModalSubmit()) {
      const [scope, action, sessionId] = interaction.customId.split(':');
      if (scope === 'wizard' && action === 'modal') return handleWizardModal(interaction, sessionId);
    }
    if (interaction.isButton()) {
      const [scope, action, id, role] = interaction.customId.split(':');
      if (scope === 'wizard' && action === 'start') return handleWizardStart(interaction, id);
      if (scope === 'recruit' && action === 'apply') return handleApply(interaction, id, role);
      if (scope === 'app' && action === 'approve') return handleApprove(interaction, id);
      if (scope === 'app' && action === 'reject') return handleReject(interaction, id);
      if (scope === 'party' && action === 'end') return handlePartyEnd(interaction, id);
      if (scope === 'party' && action === 'end-confirm') return handlePartyEndConfirm(interaction, id);
      if (scope === 'party' && action === 'end-cancel') return interaction.update({ content: 'キャンセルしました。', components: [] });
    }
  } catch (error) {
    console.error(error);
    const message = error.message || 'エラーが発生しました。';
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content: message, components: [] }).catch(() => null);
    else await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
  }
});

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(config.token);