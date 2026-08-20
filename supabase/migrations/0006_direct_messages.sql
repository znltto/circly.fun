-- Circly — Migration 0006: direct messages (DMs 1:1)
-- Duas policies principais: só os dois envolvidos leem e escrevem. Ordem
-- canonical (least, greatest) garantida via check pra facilitar UNIQUE em conversas.

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint no_self_dm check (sender_id <> recipient_id),
  constraint dm_content_length check (char_length(content) between 1 and 2000)
);

-- Índice de leitura por par (ordenado por tempo desc, típico chat).
-- Consulta padrão: mensagens entre A e B → filtro por (sender/recipient in {A,B}).
create index if not exists direct_messages_pair_idx
on public.direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);

create index if not exists direct_messages_recipient_unread_idx
on public.direct_messages (recipient_id, read_at)
where read_at is null;

alter table public.direct_messages enable row level security;

-- Ler: só o remetente OU o destinatário
drop policy if exists "dm_select_involved" on public.direct_messages;
create policy "dm_select_involved"
on public.direct_messages for select
to authenticated
using (auth.uid() in (sender_id, recipient_id));

-- Escrever: só como você mesmo (sender = auth.uid) E o destinatário deve ser amigo
-- aceito (senão qualquer um manda DM). Bloqueados também não recebem.
drop policy if exists "dm_insert_own_to_friend" on public.direct_messages;
create policy "dm_insert_own_to_friend"
on public.direct_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and sender_id <> recipient_id
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = recipient_id)
        or (f.addressee_id = auth.uid() and f.requester_id = recipient_id)
      )
  )
  and not exists (
    -- não deixa mandar se o destinatário bloqueou o remetente
    select 1 from public.friendships f
    where f.status = 'blocked'
      and f.requester_id = recipient_id
      and f.addressee_id = auth.uid()
  )
);

-- Marcar lido: só o destinatário pode marcar suas próprias mensagens como lidas
drop policy if exists "dm_update_read_recipient" on public.direct_messages;
create policy "dm_update_read_recipient"
on public.direct_messages for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- Delete: só o próprio remetente pode apagar suas mensagens
drop policy if exists "dm_delete_sender" on public.direct_messages;
create policy "dm_delete_sender"
on public.direct_messages for delete
to authenticated
using (sender_id = auth.uid());

-- Enable Realtime para live updates (idempotente)
do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then
  null;
end $$;
