-- Circly — Migration 0007: gravações de sala (LiveKit Egress + Supabase Storage).
--
-- Fluxo:
--   1) Host inicia gravação → chamamos EgressClient.startRoomCompositeEgress
--      apontando para o bucket S3-compatible do Supabase Storage.
--   2) Um webhook do LiveKit atualiza status/tamanho/duração conforme progride.
--   3) Só quem esteve na sala (host + participantes autenticados) pode ler.
--
-- A migration também adiciona `rooms.recording_consent_required` — quando `true`,
-- o cliente força um modal de consentimento antes de conectar (fase 'consent').

-- ============================================================
-- 1. NOVA COLUNA em rooms
-- ============================================================
alter table public.rooms
  add column if not exists recording_consent_required boolean not null default false;

-- ============================================================
-- 2. TABELA room_recordings
-- ============================================================
create table if not exists public.room_recordings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  egress_id text unique not null,
  status text not null default 'starting',
    -- starting | active | complete | failed | aborted
  storage_path text,
  size_bytes bigint,
  duration_seconds integer,
  started_by uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists room_recordings_room_idx
  on public.room_recordings (room_id);
create index if not exists room_recordings_expires_idx
  on public.room_recordings (expires_at);

-- ============================================================
-- 3. RLS
-- ============================================================
alter table public.room_recordings enable row level security;

-- Ler: host da sala OU alguém que já esteve como participante (mesmo se saiu).
-- Convidados não autenticados nunca leem (RLS só aceita `authenticated`).
drop policy if exists "recordings_select_participant_or_host" on public.room_recordings;
create policy "recordings_select_participant_or_host"
on public.room_recordings for select
to authenticated
using (
  exists (
    select 1 from public.rooms r
    where r.id = room_recordings.room_id
      and r.host_id = auth.uid()
  )
  or exists (
    select 1 from public.room_participants rp
    where rp.room_id = room_recordings.room_id
      and rp.profile_id = auth.uid()
  )
);

-- Insert/update/delete só via service role (endpoints /api/rooms/*/recording/*
-- e o webhook do LiveKit). Não criamos policies pra authenticated aqui.
