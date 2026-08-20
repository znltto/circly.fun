-- Circly — Migration 0009: status customizado no perfil
-- Deixa o usuário definir uma mensagem curta ("Foco total", "Voltarei em 5min")
-- e um emoji opcional. Mostrado no card da sidebar e ao lado do avatar.

alter table public.profiles
  add column if not exists status_message text,
  add column if not exists status_emoji text,
  add column if not exists status_updated_at timestamptz;

alter table public.profiles
  drop constraint if exists status_message_length;
alter table public.profiles
  add constraint status_message_length
  check (status_message is null or char_length(status_message) between 1 and 60);

alter table public.profiles
  drop constraint if exists status_emoji_length;
alter table public.profiles
  add constraint status_emoji_length
  check (status_emoji is null or char_length(status_emoji) between 1 and 8);
