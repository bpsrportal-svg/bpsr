-- BPSRPortal admin master management support
-- Run this once in Supabase SQL Editor before using /admin master editing.

alter table public.imagine_masters add column if not exists icon_url text;
alter table public.imagine_masters add column if not exists is_active boolean not null default true;
alter table public.imagine_masters add column if not exists updated_at timestamptz not null default now();

alter table public.content_masters add column if not exists icon_url text;
alter table public.class_masters add column if not exists icon_url text;

create index if not exists idx_imagine_masters_active_sort on public.imagine_masters(is_active, category, sort_order);
create index if not exists idx_content_masters_active_sort on public.content_masters(is_active, sort_order);
create index if not exists idx_content_mode_masters_active_sort on public.content_mode_masters(is_active, content_id, sort_order);
create index if not exists idx_class_masters_active_sort on public.class_masters(is_active, sort_order);

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
('威咲', 'MULTI', 90, true),
('狂音', 'MULTI', 100, true),
('剛身', 'TANK', 110, true),
('剛守', 'TANK', 120, true),
('光盾', 'TANK', 130, true),
('光砕', 'TANK', 140, true),
('森癒', 'HEALER', 150, true),
('響奏', 'HEALER', 160, true)
on conflict (name) do update set
  role_key = excluded.role_key,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.content_masters (category, name, description, sort_order, is_active) values
('ダンジョン', '衰亡の深淵', '装備周回・スコアアタック向けダンジョン', 10, true),
('ダンジョン', 'ロックスネークの巣', '装備周回・スコアアタック向けダンジョン', 20, true),
('ダンジョン', '荒魂の祭殿', '装備周回・スコアアタック向けダンジョン', 30, true),
('ダンジョン', '音無き都', '装備周回・スコアアタック向けダンジョン', 40, true),
('ダンジョン', '光亡き牢', '装備周回・スコアアタック向けダンジョン', 50, true),
('ダンジョン', '幻華流月の野', '装備周回・スコアアタック向けダンジョン', 60, true),
('レグディニス遺跡', 'レグディニス遺跡', '通常募集向けコンテンツ', 70, true),
('レイド', 'ホーンゴート・花と刃', 'レイド募集向けコンテンツ', 80, true),
('レイド', '幻花の残骸', 'レイド募集向けコンテンツ', 90, true),
('レイド', '蝕花の残影', 'レイド募集向けコンテンツ', 100, true)
on conflict (category, name) do update set
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.content_mode_masters (content_id, name, sort_order, is_active)
select c.id, mode.name, mode.sort_order, true
from public.content_masters c
cross join lateral (values ('装備周回', 10), ('スコアアタック', 20)) as mode(name, sort_order)
where c.category = 'ダンジョン'
on conflict (content_id, name) do update set sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.content_mode_masters (content_id, name, sort_order, is_active)
select c.id, '通常', 10, true
from public.content_masters c
where c.category = 'レグディニス遺跡'
on conflict (content_id, name) do update set sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.content_mode_masters (content_id, name, sort_order, is_active)
select c.id, mode.name, mode.sort_order, true
from public.content_masters c
cross join lateral (values ('イージー', 10), ('ハード', 20), ('ナイトメア', 30)) as mode(name, sort_order)
where c.category = 'レイド'
on conflict (content_id, name) do update set sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.imagine_masters (category, name, sort_order, is_active) values
('S1', 'アルーナ', 10, true),
('S1', 'ティナ', 20, true),
('S1', 'カフナ', 30, true),
('S2', 'キキョウ', 10, true),
('S2', 'セーラ', 20, true),
('S2', 'シアー', 30, true),
('S3', 'ファーレン', 10, true),
('S3', 'イヴェール', 20, true),
('S3', 'クロエ', 30, true),
('EVENT', 'イベントイマジンA', 10, true),
('EVENT', 'イベントイマジンB', 20, true)
on conflict (category, name) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

update public.recruitments set vc_mode = 'なし' where vc_mode in ('縺ｪ縺・', 'なし');
update public.recruitments set vc_mode = 'あり' where vc_mode in ('縺ゅｊ', 'あり');
update public.recruitments set vc_mode = 'あり（プライベート）' where vc_mode in ('縺ゅｊ・医・繝ｩ繧､繝吶・繝茨ｼ・', 'あり（プライベート）');
