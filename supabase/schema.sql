-- ============================================================
-- Rangement — schéma de base de données Supabase
-- À coller en entier dans Supabase > SQL Editor > New query > Run.
-- Pense à remplacer les deux adresses e-mail tout en bas.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Membres du foyer (seules ces adresses ont accès) ----------
create table if not exists public.members (
  email text primary key
);
alter table public.members enable row level security;
-- aucune policy : la table n'est lisible que via la fonction ci-dessous

-- Fonction de contrôle d'accès, dans un schéma privé (non exposé par l'API)
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function private.is_member() from public, anon;
grant execute on function private.is_member() to authenticated;

-- ---------- Emplacements : lieu > pièce > meuble > boîte (imbrication libre) ----------
create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.locations(id) on delete restrict,
  kind        text not null default 'boite'
              check (kind in ('lieu', 'piece', 'meuble', 'boite')),
  name        text not null default '',
  number      integer unique,
  is_full     boolean not null default false,
  photo_path  text,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
create index if not exists locations_parent_idx on public.locations(parent_id);

-- Numérotation automatique des boîtes (1, 2, 3…)
create sequence if not exists public.box_number_seq;

create or replace function public.assign_box_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.kind = 'boite' and new.number is null then
    new.number := nextval('public.box_number_seq');
  end if;
  return new;
end $$;

drop trigger if exists locations_box_number on public.locations;
create trigger locations_box_number
  before insert or update of kind on public.locations
  for each row execute function public.assign_box_number();

-- Interdit de ranger un emplacement dans lui-même (directement ou non)
create or replace function public.check_location_cycle()
returns trigger language plpgsql set search_path = public as $$
declare
  cur uuid := new.parent_id;
begin
  while cur is not null loop
    if cur = new.id then
      raise exception 'Un emplacement ne peut pas être rangé dans lui-même';
    end if;
    select parent_id into cur from public.locations where id = cur;
  end loop;
  return new;
end $$;

drop trigger if exists locations_no_cycle on public.locations;
create trigger locations_no_cycle
  before insert or update of parent_id on public.locations
  for each row execute function public.check_location_cycle();

-- ---------- Objets ----------
create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid references public.locations(id) on delete restrict,
  name         text not null,
  quantity     integer not null default 1 check (quantity >= 0),
  tags         text[] not null default '{}',
  notes        text not null default '',
  photo_path   text,
  is_out       boolean not null default false,
  out_at       timestamptz,
  out_by       uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid default auth.uid()
);
create index if not exists items_location_idx on public.items(location_id);

-- ---------- Étiquettes QR (pré-imprimées, réattribuables) ----------
create table if not exists public.qr_codes (
  code         text primary key,
  location_id  uuid unique references public.locations(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------- updated_at automatique ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists locations_touch on public.locations;
create trigger locations_touch before update on public.locations
  for each row execute function public.touch_updated_at();

drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- ---------- Sécurité : seuls les membres du foyer lisent / écrivent ----------
alter table public.locations enable row level security;
alter table public.items     enable row level security;
alter table public.qr_codes  enable row level security;

drop policy if exists foyer on public.locations;
create policy foyer on public.locations for all to authenticated
  using (private.is_member()) with check (private.is_member());

drop policy if exists foyer on public.items;
create policy foyer on public.items for all to authenticated
  using (private.is_member()) with check (private.is_member());

drop policy if exists foyer on public.qr_codes;
create policy foyer on public.qr_codes for all to authenticated
  using (private.is_member()) with check (private.is_member());

-- ---------- Photos (stockage privé) ----------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos foyer lecture" on storage.objects;
create policy "photos foyer lecture" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and private.is_member());

drop policy if exists "photos foyer ajout" on storage.objects;
create policy "photos foyer ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and private.is_member());

drop policy if exists "photos foyer modif" on storage.objects;
create policy "photos foyer modif" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and private.is_member());

drop policy if exists "photos foyer suppression" on storage.objects;
create policy "photos foyer suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and private.is_member());

-- ---------- Synchro en temps réel entre les deux téléphones ----------
do $$
begin
  begin alter publication supabase_realtime add table public.locations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.items;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.qr_codes;  exception when duplicate_object then null; end;
end $$;

-- ============================================================
-- ⚠️ À MODIFIER : vos deux adresses e-mail (celles des comptes créés
-- dans Authentication > Users).
-- ============================================================
insert into public.members (email) values
  ('ton.adresse@exemple.fr'),
  ('adresse.de.lucie@exemple.fr')
on conflict do nothing;
