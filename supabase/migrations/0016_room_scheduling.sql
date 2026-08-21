-- Circly — Migration 0016: agendamento interno de salas.
--
-- - scheduled_for: quando a reunião começa (nullable = "agora / não agendada")
-- - duration_minutes: janela pra contexto/lembrete (opcional)
--
-- Índice pra buscar próximas salas do usuário em ordem.
-- Idempotente.

alter table public.rooms
  add column if not exists scheduled_for timestamptz;

alter table public.rooms
  add column if not exists duration_minutes integer;

alter table public.rooms
  add constraint duration_minutes_range
  check (duration_minutes is null or duration_minutes between 5 and 720)
  not valid;

do $$ begin
  alter table public.rooms validate constraint duration_minutes_range;
exception when others then null;
end $$;

create index if not exists rooms_scheduled_idx
  on public.rooms (scheduled_for)
  where scheduled_for is not null and active = true;
