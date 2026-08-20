-- Conccord — Migration 0004: elimina recursão de RLS.
-- Erro 42P17 aparecia ao criar sala porque:
--   1. `rooms_select_participants` (em rooms) consultava room_participants
--   2. `room_participants_select_in_room` consultava a si mesma
-- Solução: remover a policy cross-table em rooms (host + friends já cobrem)
-- e a autorreferência em room_participants (host + self já cobrem).
-- Casos complexos (visitante lendo lista) usam service role server-side.

drop policy if exists "rooms_select_participants" on public.rooms;

drop policy if exists "room_participants_select_in_room" on public.room_participants;
create policy "room_participants_select_in_room"
on public.room_participants for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.rooms r
    where r.id = room_participants.room_id
      and r.host_id = auth.uid()
  )
);

drop policy if exists "messages_select_in_room" on public.messages;
create policy "messages_select_in_room"
on public.messages for select
to authenticated
using (
  sender_profile_id = auth.uid()
  or exists (
    select 1 from public.rooms r
    where r.id = messages.room_id and r.host_id = auth.uid()
  )
);

drop policy if exists "messages_insert_self" on public.messages;
create policy "messages_insert_self"
on public.messages for insert
to authenticated
with check (sender_profile_id = auth.uid());
