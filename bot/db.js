require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { DEFAULT_ROLE_SLOTS } = require('./config');

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing required env: SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

const supabase = createSupabase();

function ensureSlots(slots) {
  return {
    DPS: { ...DEFAULT_ROLE_SLOTS.DPS, ...(slots?.DPS || {}) },
    TANK: { ...DEFAULT_ROLE_SLOTS.TANK, ...(slots?.TANK || {}) },
    HEALER: { ...DEFAULT_ROLE_SLOTS.HEALER, ...(slots?.HEALER || {}) },
  };
}

async function must(dataPromise) {
  const { data, error } = await dataPromise;
  if (error) throw error;
  return data;
}

async function getProfile(discordUserId) {
  const profile = await must(
    supabase
      .from('profiles')
      .select('*')
      .eq('discord_user_id', discordUserId)
      .maybeSingle(),
  );
  if (!profile) return null;

  const imagines = await must(
    supabase
      .from('user_imagines')
      .select('limit_break, imagine_masters(category, name)')
      .eq('discord_user_id', discordUserId)
      .gte('limit_break', 0)
      .order('category', { referencedTable: 'imagine_masters', ascending: true }),
  );

  return {
    ...profile,
    imagines: (imagines || [])
      .filter((item) => item.imagine_masters)
      .map((item) => ({
        category: item.imagine_masters.category,
        name: item.imagine_masters.name,
        limit_break: item.limit_break,
      })),
  };
}

async function upsertProofChannel(discordUserId, channelId) {
  return must(
    supabase
      .from('proof_channels')
      .upsert({ discord_user_id: discordUserId, proof_channel_id: channelId, updated_at: new Date().toISOString() })
      .select('*')
      .single(),
  );
}

async function getProofChannel(discordUserId) {
  return must(
    supabase.from('proof_channels').select('*').eq('discord_user_id', discordUserId).maybeSingle(),
  );
}

async function getProofChannels(discordUserIds) {
  if (!discordUserIds.length) return [];
  return must(supabase.from('proof_channels').select('*').in('discord_user_id', discordUserIds));
}

async function createRecruitment(input) {
  const recruitment = await must(
    supabase
      .from('recruitments')
      .insert({
        owner_discord_user_id: input.owner_discord_user_id,
        title: input.title,
        content_category: input.content_category,
        content_name: input.content_name,
        content_mode: input.content_mode,
        conditions: input.conditions || '',
        companions: input.companions || '',
        vc_mode: input.vc_mode,
        role_slots: ensureSlots(input.role_slots),
      })
      .select('*')
      .single(),
  );
  await addPartyMember(recruitment.id, input.owner_discord_user_id, 'HOST');
  return { ...recruitment, role_slots: ensureSlots(recruitment.role_slots) };
}

async function updateRecruitment(id, patch) {
  const data = await must(
    supabase
      .from('recruitments')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single(),
  );
  return { ...data, role_slots: ensureSlots(data.role_slots) };
}

async function getRecruitment(id) {
  const data = await must(supabase.from('recruitments').select('*').eq('id', id).maybeSingle());
  return data ? { ...data, role_slots: ensureSlots(data.role_slots) } : null;
}

async function createOrGetApplication(recruitmentId, applicantDiscordUserId, requestedRole) {
  const existing = await must(
    supabase
      .from('recruitment_applications')
      .select('*')
      .eq('recruitment_id', recruitmentId)
      .eq('applicant_discord_user_id', applicantDiscordUserId)
      .eq('requested_role', requestedRole)
      .maybeSingle(),
  );
  if (existing) return existing;

  return must(
    supabase
      .from('recruitment_applications')
      .insert({ recruitment_id: recruitmentId, applicant_discord_user_id: applicantDiscordUserId, requested_role: requestedRole })
      .select('*')
      .single(),
  );
}

async function updateApplication(id, patch) {
  return must(
    supabase
      .from('recruitment_applications')
      .update({ ...patch, reviewed_at: patch.status ? new Date().toISOString() : undefined })
      .eq('id', id)
      .select('*')
      .single(),
  );
}

async function getApplication(id) {
  return must(supabase.from('recruitment_applications').select('*').eq('id', id).maybeSingle());
}

async function addPartyMember(recruitmentId, discordUserId, partyRole) {
  return must(
    supabase
      .from('party_members')
      .upsert({ recruitment_id: recruitmentId, discord_user_id: discordUserId, party_role: partyRole })
      .select('*')
      .single(),
  );
}

async function getPartyMembers(recruitmentId) {
  return must(supabase.from('party_members').select('*').eq('recruitment_id', recruitmentId));
}

async function recordProofPermission(recruitmentId, proofOwnerDiscordUserId, viewerDiscordUserId) {
  return must(
    supabase
      .from('proof_permissions')
      .upsert({
        recruitment_id: recruitmentId,
        proof_owner_discord_user_id: proofOwnerDiscordUserId,
        viewer_discord_user_id: viewerDiscordUserId,
      })
      .select('*')
      .single(),
  );
}

async function getProofPermissions(recruitmentId) {
  return must(supabase.from('proof_permissions').select('*').eq('recruitment_id', recruitmentId));
}

async function clearProofPermissions(recruitmentId) {
  return must(supabase.from('proof_permissions').delete().eq('recruitment_id', recruitmentId).select('*'));
}


async function getApprovedApplications(recruitmentId) {
  return must(
    supabase
      .from('recruitment_applications')
      .select('id, applicant_discord_user_id, requested_role, status, created_at')
      .eq('recruitment_id', recruitmentId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true }),
  );
}

async function getPendingBotJobs(limit = 5) {
  return must(
    supabase
      .from('discord_bot_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('available_at', new Date().toISOString())
      .order('available_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit),
  );
}

async function markBotJobProcessing(job) {
  return must(
    supabase
      .from('discord_bot_jobs')
      .update({
        status: 'processing',
        attempts: Number(job.attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle(),
  );
}

async function markBotJobDone(jobId) {
  return must(
    supabase
      .from('discord_bot_jobs')
      .update({ status: 'done', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
      .eq('id', jobId)
      .select('*')
      .single(),
  );
}

async function markBotJobFailed(job, error) {
  const attempts = Number(job.attempts || 0);
  const shouldRetry = attempts < 5;
  const nextAvailable = new Date(Date.now() + Math.min(60000 * Math.max(attempts, 1), 300000)).toISOString();
  return must(
    supabase
      .from('discord_bot_jobs')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        last_error: String(error?.message || error).slice(0, 1000),
        available_at: shouldRetry ? nextAvailable : job.available_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select('*')
      .single(),
  );
}

async function updateRecruitmentDiscordNotification(recruitmentId, channelId, messageId) {
  return updateRecruitment(recruitmentId, {
    discord_notification_channel_id: channelId,
    discord_notification_message_id: messageId,
  });
}

module.exports = {
  ensureSlots,
  getProfile,
  upsertProofChannel,
  getProofChannel,
  getProofChannels,
  createRecruitment,
  updateRecruitment,
  getRecruitment,
  createOrGetApplication,
  updateApplication,
  getApplication,
  addPartyMember,
  getPartyMembers,
  recordProofPermission,
  getProofPermissions,
  clearProofPermissions,
  getApprovedApplications,
  getPendingBotJobs,
  markBotJobProcessing,
  markBotJobDone,
  markBotJobFailed,
  updateRecruitmentDiscordNotification,
};