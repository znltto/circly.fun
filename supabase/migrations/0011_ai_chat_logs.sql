-- Circly — Migration 0011: logs do assistente IA (para painel admin)
-- Grava cada troca do /api/chat para permitir:
--  1. Ver custo total (soma cost_micro_dollars)
--  2. Ler sugestões/reclamações que os usuários mandam pro CCO
--  3. Auditar uso da OpenAI
--
-- Acesso: apenas via service role (admin lê no server, RLS bloqueia client).

create table if not exists public.ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  ip text,
  model text not null default 'gpt-4o-mini',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  -- Custo em micro-dólares (1_000_000 = US$ 1). Evita float.
  cost_micro_dollars integer not null default 0,
  user_message text,
  assistant_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_logs_created_idx
  on public.ai_chat_logs (created_at desc);
create index if not exists ai_chat_logs_user_idx
  on public.ai_chat_logs (user_id);

alter table public.ai_chat_logs enable row level security;

-- Sem policy pra role authenticated → ninguém lê pelo client anon.
-- Admin lê via service role no server (páginas /admin).
-- Insert também só via service role (o /api/chat usa admin client).
