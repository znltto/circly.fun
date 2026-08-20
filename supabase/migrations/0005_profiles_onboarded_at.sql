-- Circly — Migration 0005: profiles.onboarded_at
-- Adiciona coluna para marcar quando o usuário completou o onboarding.
-- Idempotente: seguro rodar múltiplas vezes.

alter table public.profiles
  add column if not exists onboarded_at timestamptz;
