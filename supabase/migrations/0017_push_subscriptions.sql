-- Circly — Migration 0017: Web Push subscriptions (VAPID).
--
-- Cada usuário pode ter múltiplos endpoints (celular + desktop). O `endpoint`
-- é único global (chave natural). Guarda keys pra criptografar payload.
--
-- Idempotente.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

-- Só o dono lê/apaga sua própria subscription. Insert/update via service role.
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
on public.push_subscriptions for delete
to authenticated
using (profile_id = auth.uid());
