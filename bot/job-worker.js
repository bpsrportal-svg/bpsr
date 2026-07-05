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

function profileSummary(profile) {
  const name = profile.character_name || profile.discord_global_name || profile.discord_username || profile.discord_user_id;
  const className = profile.class_name || '-';
  return `${name} / ${className}`;
}

async function sendDm(client, discordUserId, content) {
  try {
    const user = await client.users.fetch(discordUserId);
    await user.send(content);
    return { ok: true };
  } catch (error) {
    console.warn(`DM notify failed for ${discordUserId}:`, error?.message || error);
    return { ok: false, error };
  }
}

async function updateRecruitmentNotificationMessage(client, recruitment, host) {
  const targets = [
    [recruitment.discord_notification_channel_id, recruitment.discord_notification_message_id],
    [recruitment.public_message_channel_id, recruitment.public_message_id],
  ].filter(([channelId, messageId]) => channelId && messageId);

  for (const [channelId, messageId] of targets) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    const message = channel ? await channel.messages.fetch(messageId).catch(() => null) : null;
    if (message) {
      await message.edit({ embeds: [recruitmentEmbed(recruitment, host)] });
    }
  }
}

async function handlePartyReadyNotify(client, job) {
  const recruitment = await db.getRecruitment(job.recruitment_id);
  if (!recruitment) throw new Error(`Recruitment not found: ${job.recruitment_id}`);

  const host = await db.getProfile(recruitment.owner_discord_user_id);
  if (!host) throw new Error(`Recruitment host profile not found: ${recruitment.owner_discord_user_id}`);

  await updateRecruitmentNotificationMessage(client, recruitment, host);

  const applications = await db.getApprovedApplications(recruitment.id);
  const memberProfiles = [];
  for (const application of applications) {
    const profile = await db.getProfile(application.applicant_discord_user_id);
    if (profile) memberProfiles.push({ application, profile });
  }

  const detailUrl = publicRecruitmentUrl(recruitment.id);
  const participantLines = memberProfiles.length
    ? memberProfiles.map(({ application, profile }) => `- ${application.requested_role}: ${profileSummary(profile)}`).join('\n')
    : '- 承認済み参加者なし';

  const results = [];
  results.push(await sendDm(client, recruitment.owner_discord_user_id, [
    '必要人数が揃いました。',
    `募集: ${recruitment.title}`,
    '参加者:',
    participantLines,
    `詳細: ${detailUrl}`,
  ].join('\n')));

  for (const { application, profile } of memberProfiles) {
    results.push(await sendDm(client, application.applicant_discord_user_id, [
      '参加が確定しました。',
      `募集: ${recruitment.title}`,
      `募集主: ${profileSummary(host)}`,
      `あなたのロール: ${application.requested_role}`,
      `詳細: ${detailUrl}`,
    ].join('\n')));
  }

  if (!results.some((result) => result.ok)) {
    throw new Error('All party-ready DM notifications failed.');
  }
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

  if (job.job_type === 'party_ready_notify' || job.job_type === 'party_create') {
    await handlePartyReadyNotify(client, job);
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