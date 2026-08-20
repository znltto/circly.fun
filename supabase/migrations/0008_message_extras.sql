-- Circly — Migration 0008: chat rico dentro da sala.
--
-- - Estende `messages` com anexo (URL + tipo).
-- - Cria `message_reactions` (emoji, uma reação por usuário/emoji/mensagem).
-- - Habilita Realtime para `messages` e `message_reactions` para que o chat
--   da sala possa escutar `postgres_changes` diretamente.
--
-- Idempotente (roda de novo sem quebrar).

-- ============================================================
-- 1. messages: colunas de anexo
-- ============================================================
alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text; -- 'image' | 'file' (futuro)

-- ============================================================
-- 2. message_reactions
-- ============================================================
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reactor_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint one_reaction_per_user_per_emoji unique (message_id, reactor_id, emoji),
  constraint emoji_length check (char_length(emoji) between 1 and 8)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

-- ============================================================
-- 3. RLS
-- ============================================================
alter table public.message_reactions enable row level security;

drop policy if exists "reactions_select_room_member" on public.message_reactions;
create policy "reactions_select_room_member"
on public.message_reactions for select
to authenticated
using (
  exists (
    select 1 from public.messages m
    join public.rooms r on r.id = m.room_id
    where m.id = message_reactions.message_id
      and (
        r.host_id = auth.uid()
        or m.sender_profile_id = auth.uid()
        or exists (
          select 1 from public.room_participants rp
          where rp.room_id = m.room_id
            and rp.profile_id = auth.uid()
        )
      )
  )
);

drop policy if exists "reactions_insert_self" on public.message_reactions;
create policy "reactions_insert_self"
on public.message_reactions for insert
to authenticated
with check (reactor_id = auth.uid());

drop policy if exists "reactions_delete_self" on public.message_reactions;
create policy "reactions_delete_self"
on public.message_reactions for delete
to authenticated
using (reactor_id = auth.uid());

-- ============================================================
-- 4. Realtime publication
-- ============================================================
-- `alter publication ... add table` falha se a tabela já foi adicionada.
-- Envolvemos em bloco defensivo para manter a migration idempotente.
do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
