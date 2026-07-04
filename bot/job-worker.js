const db = require('./db');
const { botConfig } = require('./config');
const { recruitmentEmbed } = require('./render');

const POLL_INTERVAL_MS = Number(process.env.BOT_JOB_POLL_INTERVAL_MS || 15000);
let isPolling = false;
let timer = null;

function publicRecruitmentUrl(recruitmentId) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://bpsr-dun.vercel.app';
  return `${baseUrl.replace(/\/$/, '')}/recruitments/${recruitmentId}`;
}

function sanitizeChannelName(value) {
  return String(value || 'party')
    .normalize('NFKC')
    .replace(/[\\/#?%*:|"<>]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 90) || 'party';
}

async function findOrCreateCategory(guild, id, name) {
  if (id) {
    const channel = await guild.channels.fetch(id).catch(() => null);
    if (channel) return channel;
  }
  const existing = guild.channels.cache.find((channel) => channel.type === 4 && channel.name === name);
  if (existing) return existing;
  return guild.channels.create({ name, type: 4 });
}

function privateOverwrites(guild, client, userIds, operationsRoleId) {
  const overwrites = [
    { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
    { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels', 'Connect'] },
    ...userIds.map((id) => ({ id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'Connect'] })),
  ];

  if (operationsRoleId) {
    overwrites.push({ id: operationsRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'Connect'] });
  }

  return overwrites;
}

async function handleRecruitmentNotify(client, job) {
  const config = botConfig();
  if (!config.recruitmentChannelId) {
    throw new Error('RECRUITMENT_CHANNEL_ID is not configured.');
  }

  const recruitment = await db.getRecruitment(job.recruitment_id);
  if (!recruitment) {
    throw new Error(`Recruitment not found: ${job.recruitment_id}`);
  }

  const host = await db.getProfile(recruitment.owner_discord_user_id);
  if (!host) {
    throw new Error(`Recruitment host profile not found: ${recruitment.owner_discord_user_id}`);
  }

  const channel = await client.channels.fetch(config.recruitmentChannelId).catch(() => null);
  if (!channel) {
    throw new Error(`Recruitment channel not found: ${config.recruitmentChannelId}`);
  }

  const message = await channel.send({
    content: `新しい募集が作成されました。\n${publicRecruitmentUrl(recruitment.id)}`,
    embeds: [recruitmentEmbed(recruitment, host)],
  });

  await db.updateRecruitmentDiscordNotification(recruitment.id, channel.id, message.id);
}

function formatApplicantLine(profile) {
  const name = profile.character_name || profile.discord_global_name || profile.discord_username || profile.discord_user_id;
  const className = profile.class_name || '-';
  const power = Number(profile.power || 0).toLocaleString('ja-JP');
  const dps = Number(profile.dps_3min || 0).toLocaleString('ja-JP');
  return `${name} / ${className} / 戦力 ${power} / DPS ${dps}`;
}

async function handleApplicationNotify(client, job) {
  const recruitment = await db.getRecruitment(job.recruitment_id);
  if (!recruitment) {
    throw new Error(`Recruitment not found: ${job.recruitment_id}`);
  }

  const applicationId = job.payload?.applicationId;
  if (!applicationId) {
    throw new Error('application_notify payload.applicationId is missing.');
  }

  const application = await db.getApplication(applicationId);
  if (!application) {
    throw new Error(`Application not found: ${applicationId}`);
  }

  const applicant = await db.getProfile(application.applicant_discord_user_id);
  if (!applicant) {
    throw new Error(`Applicant profile not found: ${application.applicant_discord_user_id}`);
  }

  const owner = await client.users.fetch(recruitment.owner_discord_user_id);
  await owner.send([
    '募集に申請が来ました。',
    `募集: ${recruitment.title}`,
    `申請者: ${formatApplicantLine(applicant)}`,
    `申請ロール: ${application.requested_role}`,
    application.message ? `コメント: ${application.message}` : null,
    `詳細: ${publicRecruitmentUrl(recruitment.id)}`,
  ].filter(Boolean).join('\n'));
}

async function handlePartyCreate(client, job) {
  const config = botConfig();
  const recruitment = await db.getRecruitment(job.recruitment_id);
  if (!recruitment) throw new Error(`Recruitment not found: ${job.recruitment_id}`);
  if (recruitment.party_channel_id) return;

  const guild = await client.guilds.fetch(config.guildId);
  const host = await db.getProfile(recruitment.owner_discord_user_id);
  if (!host) throw new Error(`Recruitment host profile not found: ${recruitment.owner_discord_user_id}`);

  const applications = await db.getApprovedApplications(recruitment.id);
  const memberIds = [recruitment.owner_discord_user_id, ...applications.map((application) => application.applicant_discord_user_id)];
  const category = await findOrCreateCategory(guild, config.partyCategoryId, config.partyCategoryName);
  const hostName = host.character_name || host.discord_global_name || host.discord_username || '募集主';
  const overwrites = privateOverwrites(guild, client, memberIds, config.operationsRoleId);

  const partyChannel = await guild.channels.create({
    name: sanitizeChannelName(`🔒${hostName}のパーティ`),
    type: 0,
    parent: category.id,
    permissionOverwrites: overwrites,
  });

  let vcChannelId = recruitment.vc_channel_id || null;
  if (recruitment.vc_mode === 'あり' || recruitment.vc_mode === 'あり（プライベート）') {
    const vc = await guild.channels.create({
      name: sanitizeChannelName(`${hostName}のVC`),
      type: 2,
      parent: config.publicVcCategoryId || category.id,
      permissionOverwrites: recruitment.vc_mode === 'あり（プライベート）' ? overwrites : undefined,
    });
    vcChannelId = vc.id;
  }

  await partyChannel.send({
    content: [
      'パーティチャンネルを作成しました。',
      `募集: ${recruitment.title}`,
      `Web: ${publicRecruitmentUrl(recruitment.id)}`,
      vcChannelId ? `VC: <#${vcChannelId}>` : null,
    ].filter(Boolean).join('\n'),
  });

  await db.updateRecruitment(recruitment.id, {
    party_channel_id: partyChannel.id,
    vc_channel_id: vcChannelId,
  });
}

async function handleJob(client, job) {
  if (job.job_type === 'recruitment_notify') {
    await handleRecruitmentNotify(client, job);
    return;
  }

  if (job.job_type === 'application_notify') {
    await handleApplicationNotify(client, job);
    return;
  }

  if (job.job_type === 'party_create') {
    await handlePartyCreate(client, job);
    return;
  }

  throw new Error(`Unsupported bot job type: ${job.job_type}`);
}

async function pollBotJobs(client) {
  if (isPolling) return;
  isPolling = true;

  try {
    const jobs = await db.getPendingBotJobs(5);
    for (const job of jobs) {
      const lockedJob = await db.markBotJobProcessing(job);
      if (!lockedJob) continue;

      try {
        await handleJob(client, lockedJob);
        await db.markBotJobDone(lockedJob.id);
      } catch (error) {
        console.error('Bot job failed:', lockedJob.id, error);
        await db.markBotJobFailed(lockedJob, error);
      }
    }
  } catch (error) {
    console.error('Bot job polling failed:', error);
  } finally {
    isPolling = false;
  }
}

function startBotJobWorker(client) {
  if (timer) return;
  timer = setInterval(() => pollBotJobs(client), POLL_INTERVAL_MS);
  timer.unref?.();
  pollBotJobs(client).catch((error) => console.error('Initial bot job polling failed:', error));
  console.log(`Bot job worker started. interval=${POLL_INTERVAL_MS}ms`);
}

module.exports = { startBotJobWorker };