-- Circly — Migration 0010: permitir mensagens só com anexo (sem texto)
-- Constraint anterior exigia content >= 1 char, o que quebrava envio
-- de imagens sem legenda. Agora: content pode ser vazio SE tiver attachment_url.

alter table public.messages
  drop constraint if exists content_length;

alter table public.messages
  add constraint content_length
  check (char_length(content) between 0 and 500);

alter table public.messages
  drop constraint if exists content_or_attachment;
alter table public.messages
  add constraint content_or_attachment
  check (
    char_length(content) >= 1
    or attachment_url is not null
  );
