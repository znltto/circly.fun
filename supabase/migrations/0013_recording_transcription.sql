-- Circly — Migration 0013: transcrição e análise IA das gravações
-- Adiciona campos pra guardar transcript + análise estruturada + status.
-- Também guarda o path do áudio comprimido separado (pra transcrever
-- sem estourar o limite de 25MB do Whisper).

alter table public.room_recordings
  add column if not exists audio_path text,
  add column if not exists processing_status text not null default 'pending',
    -- pending | processing | complete | failed | skipped
  add column if not exists processed_at timestamptz,
  add column if not exists processing_error text,
  add column if not exists transcript text,
  add column if not exists summary text,
  add column if not exists topics_json jsonb,
  add column if not exists action_items_json jsonb,
  add column if not exists decisions_json jsonb,
  add column if not exists participants_json jsonb,
  add column if not exists language text,
  add column if not exists keep_video boolean not null default false;

-- Vídeo original é deletado após retention_days sem "keep_video".
-- Cron periódico varre e limpa.
create index if not exists room_recordings_processing_idx
  on public.room_recordings (processing_status);

create index if not exists room_recordings_cleanup_idx
  on public.room_recordings (started_at, keep_video)
  where storage_path is not null;
