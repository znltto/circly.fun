-- Circly — Migration 0018: E2EE opcional por sala.
--
-- e2ee_enabled: flag. A chave em si NÃO fica no banco — vai no fragmento
-- do link (`#k=<chave>`), que nunca chega no server. Isso mantém o modelo
-- de "quem tem o link tem tudo" (igual a sala com convite), mas garante
-- que o servidor LiveKit não consegue decodificar os streams.
--
-- IMPORTANTE: E2EE incompatível com Egress. Se e2ee_enabled=true, o botão
-- de gravar precisa ficar bloqueado — Egress precisa dos frames em claro
-- pra montar o composite.

alter table public.rooms
  add column if not exists e2ee_enabled boolean not null default false;
