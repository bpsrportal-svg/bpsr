create table if not exists public.content_masters (
  id bigserial primary key,
  category text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, name)
);

create table if not exists public.content_mode_masters (
  id bigserial primary key,
  content_id bigint not null references public.content_masters(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, name)
);

create table if not exists public.class_masters (
  id bigserial primary key,
  name text not null unique,
  role_key text not null check (role_key in ('DPS', 'TANK', 'HEALER', 'MULTI')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_masters (
  key text primary key check (key in ('DPS', 'TANK', 'HEALER')),
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.role_masters (key, label, sort_order, is_active) values
('DPS', 'DPS', 10, true),
('TANK', 'タンク', 20, true),
('HEALER', 'ヒーラー', 30, true)
on conflict (key) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.class_masters (name, role_key, sort_order, is_active) values
('狼弓', 'DPS', 10, true),
('鷹弓', 'DPS', 20, true),
('月影', 'DPS', 30, true),
('雷刃', 'DPS', 40, true),
('氷牙', 'DPS', 50, true),
('霜天', 'DPS', 60, true),
('烈風', 'DPS', 70, true),
('乱風', 'DPS', 80, true),
('剛身', 'TANK', 90, true),
('剛守', 'TANK', 100, true),
('光盾', 'TANK', 110, true),
('光砕', 'TANK', 120, true),
('森癒', 'HEALER', 130, true),
('威咲', 'MULTI', 140, true),
('狂音', 'MULTI', 150, true),
('響奏', 'HEALER', 160, true)
on conflict (name) do update set
  role_key = excluded.role_key,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.content_masters (category, name, sort_order, is_active) values
('ダンジョン', '衰亡の深淵', 10, true),
('ダンジョン', 'ロックスネークの巣', 20, true),
('ダンジョン', '荒魂の祭殿', 30, true),
('ダンジョン', '音無き都', 40, true),
('ダンジョン', '光亡き牢', 50, true),
('ダンジョン', '幻華流月の野', 60, true),
('レグディニス遺跡', 'レグディニス遺跡', 70, true),
('レイド', 'ホーンゴート・花と刃', 80, true),
('レイド', '幻花の残骸', 90, true),
('レイド', '蝕花の残影', 100, true)
on conflict (category, name) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.content_mode_masters (content_id, name, sort_order, is_active)
select c.id, mode.name, mode.sort_order, true
from public.content_masters c
cross join lateral (
  values ('装備周回', 10), ('スコアアタック', 20)
) as mode(name, sort_order)
where c.category = 'ダンジョン'
on conflict (content_id, name) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.content_mode_masters (content_id, name, sort_order, is_active)
select c.id, '通常', 10, true
from public.content_masters c
where c.category = 'レグディニス遺跡'
on conflict (content_id, name) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.content_mode_masters (content_id, name, sort_order, is_active)
select c.id, mode.name, mode.sort_order, true
from public.content_masters c
cross join lateral (
  values ('イージー', 10), ('ハード', 20), ('ナイトメア', 30)
) as mode(name, sort_order)
where c.category = 'レイド'
on conflict (content_id, name) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

create table if not exists public.recruitments (
  id bigserial primary key,
  owner_discord_user_id text not null references public.profiles(discord_user_id) on delete cascade,
  title text not null,
  content_category text not null,
  content_name text not null,
  content_mode text,
  conditions text,
  vc_mode text not null default 'なし',
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed', 'cancelled')),
  role_slots jsonb not null default '{"DPS":{"required":0,"accepted":0},"TANK":{"required":0,"accepted":0},"HEALER":{"required":0,"accepted":0}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.recruitments add column if not exists content_id bigint references public.content_masters(id);
alter table public.recruitments add column if not exists content_mode_id bigint references public.content_mode_masters(id);
alter table public.recruitments add column if not exists required_classes jsonb not null default '{"DPS":[],"TANK":[],"HEALER":[]}'::jsonb;
alter table public.recruitments add column if not exists source text not null default 'web';
alter table public.recruitments add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private'));
alter table public.recruitments add column if not exists cancelled_at timestamptz;
alter table public.recruitments add column if not exists discord_notification_channel_id text;
alter table public.recruitments add column if not exists discord_notification_message_id text;
alter table public.recruitments add column if not exists party_channel_id text;
alter table public.recruitments add column if not exists vc_channel_id text;

create index if not exists idx_recruitments_owner on public.recruitments(owner_discord_user_id);
create index if not exists idx_recruitments_status on public.recruitments(status);
create index if not exists idx_recruitments_content_id on public.recruitments(content_id);
create index if not exists idx_recruitments_updated_at on public.recruitments(updated_at desc);

create table if not exists public.recruitment_applications (
  id bigserial primary key,
  recruitment_id bigint not null references public.recruitments(id) on delete cascade,
  applicant_discord_user_id text not null references public.profiles(discord_user_id) on delete cascade,
  requested_role text not null check (requested_role in ('DPS', 'TANK', 'HEALER')),
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (recruitment_id, applicant_discord_user_id)
);

alter table public.recruitment_applications add column if not exists message text;
alter table public.recruitment_applications add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_recruitment_applications_recruitment on public.recruitment_applications(recruitment_id);
create index if not exists idx_recruitment_applications_applicant on public.recruitment_applications(applicant_discord_user_id);
create index if not exists idx_recruitment_applications_status on public.recruitment_applications(status);

create table if not exists public.discord_bot_jobs (
  id bigserial primary key,
  job_type text not null check (job_type in ('recruitment_notify', 'recruitment_update', 'application_notify', 'party_create', 'party_close')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  recruitment_id bigint references public.recruitments(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  last_error text,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_discord_bot_jobs_pending on public.discord_bot_jobs(status, available_at, id);
create index if not exists idx_discord_bot_jobs_recruitment on public.discord_bot_jobs(recruitment_id);