-- Circly — Migration 0015: log de ações moderativas por sala (audit trail).
--
-- Registra ações que interferem em outros participantes:
--   - join, leave (participantes entrando/saindo)
--   - mute-audio, mute-video, mute-screen (silenciamento pelo host)
--   - kick (remoção pelo host)
--   - lock, unlock (trancamento da sala)
--   - lobby-on, lobby-off, lobby-admit, lobby-deny (waiting room)
--   - host-transfer (mudança de host)
--   - recording-start, recording-stop
--
-- Só o host da sala lê. Host pode exportar o log inteiro pela UI (CSV).
-- Insert via service role (endpoints backend).

create table if not exists public.room_actions_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_display_name text,
  target_profile_id uuid references public.profiles(id) on delete set null,
  target_display_name text,
  action text not null,
  detail text,
  created_at timestamptz not null default now(),
  constraint room_actions_log_action_length check (
    char_length(action) between 1 and 40
  ),
  constraint room_actions_log_detail_length check (
    detail is null or char_length(detail) <= 500
  )
);

create index if not exists room_actions_log_room_created_idx
  on public.room_actions_log (room_id, created_at desc);

alter table public.room_actions_log enable row level security;

-- Só o host da sala lê o log.
drop policy if exists "room_actions_log_select_host" on public.room_actions_log;
create policy "room_actions_log_select_host"
on public.room_actions_log for select
to authenticated
using (
  exists (
    select 1 from public.rooms r
    where r.id = room_actions_log.room_id
      and r.host_id = auth.uid()
  )
);

-- Insert/update/delete: só via service role.
