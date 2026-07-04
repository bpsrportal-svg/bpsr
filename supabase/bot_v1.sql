create table if not exists public.proof_channels (
  discord_user_id text primary key references public.profiles(discord_user_id) on delete cascade,
  proof_channel_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruitments (
  id bigserial primary key,
  owner_discord_user_id text not null references public.profiles(discord_user_id) on delete cascade,
  title text not null,
  content_category text not null,
  content_name text not null,
  content_mode text,
  conditions text,
  companions text,
  vc_mode text not null default 'なし',
  vc_channel_id text,
  public_message_channel_id text,
  public_message_id text,
  application_channel_id text,
  party_channel_id text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  role_slots jsonb not null default '{"DPS":{"required":0,"accepted":0},"TANK":{"required":0,"accepted":0},"HEALER":{"required":0,"accepted":0}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists recruitments_owner_idx on public.recruitments(owner_discord_user_id);
create index if not exists recruitments_status_idx on public.recruitments(status);

create table if not exists public.recruitment_applications (
  id bigserial primary key,
  recruitment_id bigint not null references public.recruitments(id) on delete cascade,
  applicant_discord_user_id text not null references public.profiles(discord_user_id) on delete cascade,
  requested_role text not null check (requested_role in ('DPS', 'TANK', 'HEALER')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  application_message_id text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (recruitment_id, applicant_discord_user_id, requested_role)
);

create index if not exists recruitment_applications_recruitment_idx on public.recruitment_applications(recruitment_id);

create table if not exists public.party_members (
  recruitment_id bigint not null references public.recruitments(id) on delete cascade,
  discord_user_id text not null references public.profiles(discord_user_id) on delete cascade,
  party_role text not null check (party_role in ('HOST', 'DPS', 'TANK', 'HEALER')),
  created_at timestamptz not null default now(),
  primary key (recruitment_id, discord_user_id, party_role)
);

create table if not exists public.proof_permissions (
  recruitment_id bigint not null references public.recruitments(id) on delete cascade,
  proof_owner_discord_user_id text not null references public.profiles(discord_user_id) on delete cascade,
  viewer_discord_user_id text not null references public.profiles(discord_user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recruitment_id, proof_owner_discord_user_id, viewer_discord_user_id)
);