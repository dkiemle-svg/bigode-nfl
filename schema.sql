-- ============================================================================
-- Bigode NFL — schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Painel do Supabase → SQL Editor → New query → cole tudo → Run)
-- ============================================================================

-- Extensão para gerar UUIDs (normalmente já vem ativa no Supabase)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: nome de exibição de cada usuário (o auth.users padrão não é
-- legível pelos outros usuários, então guardamos um nome público aqui)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: qualquer autenticado pode ler"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: usuário só edita o próprio perfil"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles: usuário só atualiza o próprio perfil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Cria o profile automaticamente quando alguém se cadastra (usa o nome
-- passado em options.data.nome no signUp, com fallback pro e-mail)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- bilhetes: a aposta compartilhada (o print do bilhete que alguém posta).
-- valor_referencia / odd_referencia = o que aparece no print, usado como
-- valor padrão sugerido quando alguém marca "peguei essa aposta".
-- ----------------------------------------------------------------------------
create table if not exists public.bilhetes (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid not null references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now(),
  casa text not null,
  evento text not null,
  codigo text,
  obs text default '',
  valor_referencia numeric,
  odd_referencia numeric,
  selecoes jsonb not null default '[]'::jsonb
);

alter table public.bilhetes enable row level security;

create policy "bilhetes: qualquer autenticado pode ler"
  on public.bilhetes for select
  to authenticated
  using (true);

create policy "bilhetes: qualquer autenticado pode postar"
  on public.bilhetes for insert
  to authenticated
  with check (criado_por = auth.uid());

create policy "bilhetes: só quem postou pode editar"
  on public.bilhetes for update
  to authenticated
  using (criado_por = auth.uid())
  with check (criado_por = auth.uid());

create policy "bilhetes: só quem postou pode excluir"
  on public.bilhetes for delete
  to authenticated
  using (criado_por = auth.uid());

-- ----------------------------------------------------------------------------
-- entradas: o registro individual e PRIVADO de cada usuário quando ele marca
-- "peguei essa aposta". valor/odd começam iguais aos de referência do
-- bilhete mas podem ser editados livremente (caso a entrada dele tenha sido
-- diferente do print). Uma linha por (bilhete, usuário) — desmarcar o check
-- apaga a linha.
-- ----------------------------------------------------------------------------
create table if not exists public.entradas (
  id uuid primary key default gen_random_uuid(),
  bilhete_id uuid not null references public.bilhetes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  valor numeric not null,
  odd numeric not null,
  status text not null default 'pendente' check (status in ('pendente', 'green', 'red', 'cashout')),
  valor_cashout numeric,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (bilhete_id, user_id)
);

alter table public.entradas enable row level security;

create policy "entradas: usuário só vê as próprias"
  on public.entradas for select
  to authenticated
  using (user_id = auth.uid());

create policy "entradas: usuário só cria as próprias"
  on public.entradas for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "entradas: usuário só atualiza as próprias"
  on public.entradas for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "entradas: usuário só apaga as próprias"
  on public.entradas for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Realtime: habilita atualização instantânea nas 3 tabelas
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.bilhetes;
alter publication supabase_realtime add table public.entradas;
alter publication supabase_realtime add table public.profiles;

-- ----------------------------------------------------------------------------
-- Índices úteis
-- ----------------------------------------------------------------------------
create index if not exists idx_entradas_bilhete on public.entradas (bilhete_id);
create index if not exists idx_entradas_user on public.entradas (user_id);
create index if not exists idx_bilhetes_criado_por on public.bilhetes (criado_por);

-- Fim do schema. Depois de rodar isto, vá em Authentication → Providers e
-- confirme que "Email" está habilitado (é o padrão). Se quiser testar rápido
-- sem confirmação por e-mail, desative "Confirm email" em Authentication →
-- Settings (não recomendado em produção, só pra testar com os amigos rápido).
