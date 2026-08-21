-- Circly — Migration 0019: convites de amigos pra salas
--
-- Fluxo:
--   1. Host cria sala e escolhe amigos aceitos pra convidar (SuccessCard).
--   2. Server insere uma row por convidado em room_invitations (status=pending).
--   3. Convidado vê em /convites → aceita (redirect pra sala) ou recusa.
--   4. Notificação chega por DM automática + Web Push (best-effort).
--
-- Unique (room_id, invitee_id) evita convite duplicado da mesma sala.

create table if not exists public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete set null,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_invite check (inviter_id <> invitee_id),
  unique (room_id, invitee_id)
);

create index if not exists room_invitations_invitee_pending_idx
on public.room_invitations (invitee_id, status)
where status = 'pending';

create index if not exists room_invitations_room_idx
on public.room_invitations (room_id);

alter table public.room_invitations enable row level security;

-- Ler: convidado vê seus, inviter também.
drop policy if exists "rinv_select_involved" on public.room_invitations;
create policy "rinv_select_involved"
on public.room_invitations for select
to authenticated
using (auth.uid() in (invitee_id, inviter_id));

-- Inserir: só o próprio inviter, e apenas se for amigo aceito do invitee.
drop policy if exists "rinv_insert_inviter_friend" on public.room_invitations;
create policy "rinv_insert_inviter_friend"
on public.room_invitations for insert
to authenticated
with check (
  inviter_id = auth.uid()
  and inviter_id <> invitee_id
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = invitee_id)
        or (f.addressee_id = auth.uid() and f.requester_id = invitee_id)
      )
  )
  and exists (
    select 1 from public.rooms r
    where r.id = room_id
      and r.host_id = auth.uid()
      and r.active
  )
);

-- Update: só o invitee pode responder (aceitar/recusar).
drop policy if exists "rinv_update_invitee" on public.room_invitations;
create policy "rinv_update_invitee"
on public.room_invitations for update
to authenticated
using (invitee_id = auth.uid())
with check (invitee_id = auth.uid());

-- Delete: só o inviter (revogar convite).
drop policy if exists "rinv_delete_inviter" on public.room_invitations;
create policy "rinv_delete_inviter"
on public.room_invitations for delete
to authenticated
using (inviter_id = auth.uid());

-- Enable Realtime para live updates
do $$
begin
  alter publication supabase_realtime add table public.room_invitations;
exception when duplicate_object then
  null;
end $$;
