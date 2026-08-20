-- Conccord — Migration 0001: profiles
-- Cria a tabela de perfis 1:1 com auth.users + trigger de criação automática.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (char_length(username) between 3 and 24),
  constraint username_format check (username ~ '^[a-z0-9_]+$'),
  constraint display_name_length check (char_length(display_name) between 1 and 40)
);

create index if not exists profiles_username_idx on public.profiles (username);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- Cada usuário lê o próprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

-- Perfis públicos: qualquer autenticado pode ler campos básicos de outros
-- perfis (necessário para busca por username e lista de amigos).
-- OBS: se quiser mais privacidade, restringir a apenas amigos aceitos.
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
on public.profiles for select
to authenticated
using (true);

-- Usuário só atualiza o próprio perfil
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Nenhum insert direto pelo client — feito via trigger abaixo
drop policy if exists "profiles_no_direct_insert" on public.profiles;

-- Sem policy de INSERT nem DELETE: bloqueado por padrão com RLS ativo.

-- Trigger: ao criar usuário em auth.users, cria linha em profiles.
-- Usa email prefix como username inicial + suffix aleatório para colisões.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  attempt int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if char_length(base_username) < 3 then
    base_username := 'user' || substr(md5(new.id::text), 1, 6);
  end if;
  if char_length(base_username) > 18 then
    base_username := substr(base_username, 1, 18);
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) and attempt < 20 loop
    attempt := attempt + 1;
    final_username := base_username || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'display_name', final_username));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- ============================================================
-- NEXT MIGRATION
-- ============================================================

-- Conccord — Migration 0002: friendships
-- Solicitações de amizade + amizades aceitas + bloqueios.

create type friendship_status as enum ('pending', 'accepted', 'blocked');

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_friendship check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

-- Impede que Alice e Bob tenham duas linhas simultâneas (Alice→Bob e Bob→Alice)
-- quando alguma delas está pendente ou aceita.
create unique index if not exists friendships_directional_uniqueness
on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
) where status in ('pending', 'accepted');

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_status_idx on public.friendships (status);

-- updated_at automático (reusa a função criada em 0001)
drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

-- RLS
alter table public.friendships enable row level security;

-- Ler: só envolvidos veem a linha
drop policy if exists "friendships_select_involved" on public.friendships;
create policy "friendships_select_involved"
on public.friendships for select
to authenticated
using (auth.uid() in (requester_id, addressee_id));

-- Criar: só posso criar solicitações onde eu sou o requester
drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own"
on public.friendships for insert
to authenticated
with check (
  auth.uid() = requester_id
  and requester_id <> addressee_id
);

-- Atualizar (aceitar/recusar/bloquear): só envolvidos
-- Regras específicas ficam em server actions (só o addressee aceita, etc.)
drop policy if exists "friendships_update_involved" on public.friendships;
create policy "friendships_update_involved"
on public.friendships for update
to authenticated
using (auth.uid() in (requester_id, addressee_id))
with check (auth.uid() in (requester_id, addressee_id));

-- Deletar: só envolvidos
drop policy if exists "friendships_delete_involved" on public.friendships;
create policy "friendships_delete_involved"
on public.friendships for delete
to authenticated
using (auth.uid() in (requester_id, addressee_id));


-- ============================================================
-- NEXT MIGRATION
-- ============================================================

-- Conccord — Migration 0003: rooms, invites, participants, messages.
-- Ordem: (1) todos os enums e tabelas, (2) triggers/índices, (3) RLS + policies.
-- Assim policies podem referenciar qualquer tabela criada acima sem forward-ref.

-- ============================================================
-- 1. ENUMS
-- ============================================================
do $$ begin
  create type room_visibility as enum ('private', 'link', 'friends');
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 2. TABLES
-- ============================================================
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  visibility room_visibility not null default 'link',
  allow_guests boolean not null default true,
  max_participants integer not null default 10,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  ended_at timestamptz,
  constraint title_length check (char_length(title) between 1 and 60),
  constraint max_participants_range check (max_participants between 2 and 50),
  constraint slug_format check (slug ~ '^[a-z0-9]{6,16}$')
);

create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  token_hash text unique not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  max_uses integer,
  uses_count integer not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint max_uses_positive check (max_uses is null or max_uses > 0)
);

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  guest_name text,
  livekit_identity text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint participant_identity_shape check (
    (profile_id is not null and guest_name is null)
    or (profile_id is null and guest_name is not null)
  ),
  constraint guest_name_length check (guest_name is null or char_length(guest_name) between 1 and 40)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  content text not null,
  created_at timestamptz not null default now(),
  constraint content_length check (char_length(content) between 1 and 500),
  constraint sender_shape check (
    (sender_profile_id is not null and guest_name is null)
    or (sender_profile_id is null and guest_name is not null)
  )
);

-- ============================================================
-- 3. INDEXES & TRIGGERS
-- ============================================================
create index if not exists rooms_host_idx on public.rooms (host_id);
create index if not exists rooms_active_idx on public.rooms (active) where active = true;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

create index if not exists room_invites_room_idx on public.room_invites (room_id);

create unique index if not exists room_participants_identity_uidx
on public.room_participants (room_id, livekit_identity)
where left_at is null;
create index if not exists room_participants_room_idx on public.room_participants (room_id);
create index if not exists room_participants_profile_idx on public.room_participants (profile_id);

create index if not exists messages_room_created_idx
on public.messages (room_id, created_at desc);

-- ============================================================
-- 4. RLS + POLICIES
-- ============================================================
alter table public.rooms enable row level security;
alter table public.room_invites enable row level security;
alter table public.room_participants enable row level security;
alter table public.messages enable row level security;

-- ---------- rooms ----------
drop policy if exists "rooms_select_host" on public.rooms;
create policy "rooms_select_host"
on public.rooms for select
to authenticated
using (auth.uid() = host_id);

drop policy if exists "rooms_select_friends" on public.rooms;
create policy "rooms_select_friends"
on public.rooms for select
to authenticated
using (
  active
  and visibility = 'friends'
  and exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = rooms.host_id)
        or (addressee_id = auth.uid() and requester_id = rooms.host_id)
      )
  )
);

-- (removida: `rooms_select_participants` causava recursão de RLS.
--  Participantes que precisam ler dados da sala fazem via server actions com
--  service role.)

drop policy if exists "rooms_insert_own" on public.rooms;
create policy "rooms_insert_own"
on public.rooms for insert
to authenticated
with check (auth.uid() = host_id);

drop policy if exists "rooms_update_host" on public.rooms;
create policy "rooms_update_host"
on public.rooms for update
to authenticated
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

drop policy if exists "rooms_delete_host" on public.rooms;
create policy "rooms_delete_host"
on public.rooms for delete
to authenticated
using (auth.uid() = host_id);

-- ---------- room_invites ----------
drop policy if exists "room_invites_owner" on public.room_invites;
create policy "room_invites_owner"
on public.room_invites for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- ---------- room_participants ----------
-- Sem autorreferência para evitar recursão. Se o usuário precisar ver outros
-- participantes de uma sala em que está mas não é host, isso é feito
-- server-side via service role (ex: livekit/token).
drop policy if exists "room_participants_select_in_room" on public.room_participants;
create policy "room_participants_select_in_room"
on public.room_participants for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.rooms r
    where r.id = room_participants.room_id
      and r.host_id = auth.uid()
  )
);

drop policy if exists "room_participants_insert_self" on public.room_participants;
create policy "room_participants_insert_self"
on public.room_participants for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "room_participants_update_self" on public.room_participants;
create policy "room_participants_update_self"
on public.room_participants for update
to authenticated
using (profile_id = auth.uid());

-- ---------- messages ----------
-- Sem cross-table em subquery para evitar recursão.
-- Host lê tudo; usuário lê o que ele mesmo enviou. Chat em tempo real via
-- Realtime broadcast (não persiste na tabela messages neste MVP).
drop policy if exists "messages_select_in_room" on public.messages;
create policy "messages_select_in_room"
on public.messages for select
to authenticated
using (
  sender_profile_id = auth.uid()
  or exists (
    select 1 from public.rooms r
    where r.id = messages.room_id and r.host_id = auth.uid()
  )
);

drop policy if exists "messages_insert_self" on public.messages;
create policy "messages_insert_self"
on public.messages for insert
to authenticated
with check (sender_profile_id = auth.uid());
