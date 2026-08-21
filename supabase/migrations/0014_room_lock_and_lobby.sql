-- Circly — Migration 0014: lock de sala + lobby (waiting room)
--
-- lock: host pode "trancar" a sala depois que começa. Requests ao
--   /api/livekit/token retornam 403 pra novos participantes enquanto
--   locked=true. Host continua entrando.
--
-- lobby: quando lobby_enabled=true, participantes NÃO recebem token na hora —
--   ficam num estado 'pending' até o host aprovar via lobby_admits. Host
--   continua com fluxo direto (sempre aprovado).
--
-- Toda a migration é idempotente (add if not exists, drop policy if exists).

-- ============================================================
-- 1. NOVAS COLUNAS em rooms
-- ============================================================
alter table public.rooms
  add column if not exists locked boolean not null default false;

alter table public.rooms
  add column if not exists lobby_enabled boolean not null default false;

-- ============================================================
-- 2. TABELA room_lobby (fila de espera)
-- ============================================================
create table if not exists public.room_lobby (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  guest_name text,
  display_name text not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,           -- 'admitted' | 'denied' | 'cancelled' | 'timeout'
  admit_token uuid,          -- token único emitido no admit; cliente troca por token LiveKit
  constraint room_lobby_identity_shape check (
    (profile_id is not null and guest_name is null)
    or (profile_id is null and guest_name is not null)
  ),
  constraint room_lobby_guest_name_length check (
    guest_name is null or char_length(guest_name) between 1 and 40
  ),
  constraint room_lobby_display_name_length check (
    char_length(display_name) between 1 and 40
  ),
  constraint room_lobby_resolution_shape check (
    resolution is null
    or resolution in ('admitted', 'denied', 'cancelled', 'timeout')
  )
);

-- Um usuário logado só pode ter um pedido pendente por sala
create unique index if not exists room_lobby_pending_profile_uidx
  on public.room_lobby (room_id, profile_id)
  where resolved_at is null and profile_id is not null;

create index if not exists room_lobby_room_idx on public.room_lobby (room_id);
create index if not exists room_lobby_requested_idx
  on public.room_lobby (requested_at);

-- ============================================================
-- 3. RLS + POLICIES
-- ============================================================
alter table public.room_lobby enable row level security;

-- Ler: o próprio requisitante (se logado) OU o host da sala.
drop policy if exists "room_lobby_select_self_or_host" on public.room_lobby;
create policy "room_lobby_select_self_or_host"
on public.room_lobby for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.rooms r
    where r.id = room_lobby.room_id
      and r.host_id = auth.uid()
  )
);

-- Insert: proibido via client. Endpoints /api/rooms/[slug]/lobby/* usam service role.
-- (Guests não-autenticados não teriam auth.uid() de qualquer forma.)

-- Update: só o host resolve (admit/deny). Todo o resto via service role.
drop policy if exists "room_lobby_update_host" on public.room_lobby;
create policy "room_lobby_update_host"
on public.room_lobby for update
to authenticated
using (
  exists (
    select 1 from public.rooms r
    where r.id = room_lobby.room_id
      and r.host_id = auth.uid()
  )
);
