create table if not exists profiles (
  discord_user_id text primary key,
  discord_username text,
  discord_global_name text,
  discord_avatar text,
  character_name text,
  class_name text not null,
  power integer not null default 0,
  dps_3min integer not null default 0,
  sea_weapon_level integer,
  profile_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint profiles_power_nonnegative check (power >= 0),
  constraint profiles_dps_3min_nonnegative check (dps_3min >= 0),
  constraint profiles_sea_weapon_level check (
    sea_weapon_level is null or sea_weapon_level in (100, 140, 160, 180, 220, 240, 260)
  )
);

create table if not exists imagine_masters (
  id bigserial primary key,
  category text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(category, name),
  constraint imagine_masters_category check (category in ('S1', 'S2', 'S3', 'EVENT'))
);

create table if not exists user_imagines (
  discord_user_id text not null references profiles(discord_user_id) on delete cascade,
  imagine_id bigint not null references imagine_masters(id) on delete cascade,
  limit_break integer not null default -1,
  updated_at timestamptz not null default now(),
  primary key (discord_user_id, imagine_id),
  constraint limit_break_range check (limit_break >= -1 and limit_break <= 5)
);

insert into imagine_masters (category, name, sort_order) values
('S1', '繧｢繝ｫ繝ｼ繝・, 10),
('S1', '繝・ぅ繝・, 20),
('S1', '繧ｪ繝ｫ繝ｴ繧ｧ繝ｩ', 30),
('S1', '繧ｿ繝ｼ繧ｿ', 40),
('S1', '繧ｭ繝ｳ繧ｰ繝繝ｼ繧ｯ', 50),
('S1', '繧ｵ繝ｳ繝繝ｼ繧ｪ繝ｼ繧ｬ', 60),
('S1', '繝輔Ο繧ｹ繝医が繝ｼ繧ｬ', 70),
('S1', '繝繝ｼ繧ｯ繝懊せ', 80),
('S1', '蠏舌・繧ｭ繝ｳ繧ｰ繧ｴ繝悶Μ繝ｳ', 90),
('S1', '繝輔Ξ繧､繝繧ｪ繝ｼ繧ｬ', 100),
('S1', '逡ｰ蝗ｽ縺ｮ螻ｱ雉企聞繝偵げ繝・, 110),
('S1', '繧ｴ繝ｼ繧ｹ繝医き繝九け繝｢', 120),
('S1', '迪帙ｋ驥題牡', 130),
('S1', '繝ｴ繧ｧ繝弱Α繝ｼ繝ｳ縺ｮ蟾｣', 140),
('S1', '驩・甥', 150),
('S1', '繝倥Χ繝ｳ繧ｹ繧ｫ繧､', 160),
('S1', '繧ｭ繝ｳ繧ｰ繧ｮ繝ｫ繝溘・', 170),
('S1', '繧ｭ繝ｳ繧ｰ繧ｴ繝悶Μ繝ｳ', 180),
('S2', '繝ｭ繝ｭ繝ｼ繝ｩ', 10),
('S2', '繝懊う繧ｹ', 20),
('S2', '繝峨Ο繧ｷ繝ｼ', 30),
('S2', '繝輔ぃ繝ｫ繝輔ぃ繝ｩ', 40),
('S2', '繝舌ず繝ｪ繧ｹ繧ｯ', 50),
('S2', '鮟堤｣雁・蝗｣縺ｮ隴ｷ陦幃嚏髟ｷ', 60),
('S2', '繧ｴ繝悶Μ繝ｳ繧ｦ繧ｩ繝ｼ繝ｭ繝ｼ繝・, 70),
('S2', '螟ｩ謇咲曝阯榊､ｧ邇・, 80),
('S2', '迪帙ｋ迯｣', 90),
('S2', '轤手ｧ・, 100),
('S3', '繝・Φ繝ｴ繧ｧ繝ｫ', 10),
('S3', '繧､繧ｴ繝ｬ繧ｦ繧ｹ', 20),
('S3', '蟷ｻ遖阪リ繝・・', 30),
('S3', '繧ｬ繝医げ繝ｪ繝・, 40),
('S3', '繝励Ξ繝・ち繝ｼ', 50),
('S3', '繧ｭ繝ｳ繧ｰ繝峨ざ繝ｫ繝槭Φ', 60),
('S3', '繧ｯ繝ｭ繝・け繧ｲ繧､繧ｶ繝ｼ', 70),
('S3', '繝・ャ繝峨Μ繝ｼ繝懊い', 80),
('S3', '蝸懆｡豈帷帥', 90),
('EVENT', '繝翫ヤ', 10),
('EVENT', '繝ｫ繝ｼ繧ｷ繝ｼ', 20)
on conflict (category, name) do update
set sort_order = excluded.sort_order;

create index if not exists idx_profiles_uid on profiles(uid);
create index if not exists idx_profiles_class_name on profiles(class_name);
create index if not exists idx_profiles_power on profiles(power);
create index if not exists idx_profiles_dps_3min on profiles(dps_3min);
create index if not exists idx_user_imagines_imagine_id on user_imagines(imagine_id);
create index if not exists idx_user_imagines_limit_break on user_imagines(limit_break);
