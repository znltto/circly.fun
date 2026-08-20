-- Circly — Migration 0002: friendships
-- Solicitações de amizade + amizades aceitas + bloqueios.

create type friendship_status as enum ('pending', 'accepted', 'blocked');

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_friendship check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

-- Impede que Alice e Bob tenham duas linhas simultâneas (Alice→Bob e Bob→Alice)
-- quando alguma delas está pendente ou aceita.
create unique index if not exists friendships_directional_uniqueness
on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
) where status in ('pending', 'accepted');

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_status_idx on public.friendships (status);

-- updated_at automático (reusa a função criada em 0001)
drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

-- RLS
alter table public.friendships enable row level security;

-- Ler: só envolvidos veem a linha
drop policy if exists "friendships_select_involved" on public.friendships;
create policy "friendships_select_involved"
on public.friendships for select
to authenticated
using (auth.uid() in (requester_id, addressee_id));

-- Criar: só posso criar solicitações onde eu sou o requester
drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own"
on public.friendships for insert
to authenticated
with check (
  auth.uid() = requester_id
  and requester_id <> addressee_id
);

-- Atualizar (aceitar/recusar/bloquear): só envolvidos
-- Regras específicas ficam em server actions (só o addressee aceita, etc.)
drop policy if exists "friendships_update_involved" on public.friendships;
create policy "friendships_update_involved"
on public.friendships for update
to authenticated
using (auth.uid() in (requester_id, addressee_id))
with check (auth.uid() in (requester_id, addressee_id));

-- Deletar: só envolvidos
drop policy if exists "friendships_delete_involved" on public.friendships;
create policy "friendships_delete_involved"
on public.friendships for delete
to authenticated
using (auth.uid() in (requester_id, addressee_id));
