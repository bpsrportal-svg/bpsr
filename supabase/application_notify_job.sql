-- Allow application notification jobs for private DM alerts to recruitment owners.
alter table public.discord_bot_jobs
  drop constraint if exists discord_bot_jobs_job_type_check;

alter table public.discord_bot_jobs
  add constraint discord_bot_jobs_job_type_check
  check (job_type in (
    'recruitment_notify',
    'recruitment_update',
    'application_notify',
    'party_create',
    'party_close'
  ));