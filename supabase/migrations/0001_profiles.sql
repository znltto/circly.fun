-- Circly — Migration 0001: profiles
-- Cria a tabela de perfis 1:1 com auth.users + trigger de criação automática.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (char_length(username) between 3 and 24),
  constraint username_format check (username ~ '^[a-z0-9_]+$'),
  constraint display_name_length check (char_length(display_name) between 1 and 40)
);

create index if not exists profiles_username_idx on public.profiles (username);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- Cada usuário lê o próprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

-- Perfis públicos: qualquer autenticado pode ler campos básicos de outros
-- perfis (necessário para busca por username e lista de amigos).
-- OBS: se quiser mais privacidade, restringir a apenas amigos aceitos.
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
on public.profiles for select
to authenticated
using (true);

-- Usuário só atualiza o próprio perfil
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Nenhum insert direto pelo client — feito via trigger abaixo
drop policy if exists "profiles_no_direct_insert" on public.profiles;

-- Sem policy de INSERT nem DELETE: bloqueado por padrão com RLS ativo.

-- Trigger: ao criar usuário em auth.users, cria linha em profiles.
-- Usa email prefix como username inicial + suffix aleatório para colisões.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  attempt int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if char_length(base_username) < 3 then
    base_username := 'user' || substr(md5(new.id::text), 1, 6);
  end if;
  if char_length(base_username) > 18 then
    base_username := substr(base_username, 1, 18);
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) and attempt < 20 loop
    attempt := attempt + 1;
    final_username := base_username || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'display_name', final_username));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
