begin;

create extension if not exists pgcrypto;

-- 1. ADMINISTRADOR
create table if not exists public.administradores (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  email     text not null unique,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.administradores a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. TABELAS DO SITE
create table if not exists public.usuarios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  idade      smallint check (idade between 1 and 120),
  email      text not null unique check (email = lower(email)),
  senha_hash text,
  criado_em  timestamptz not null default now()
);

create table if not exists public.grupos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  esporte       text not null,
  local         text not null default 'Não informado',
  data_hora     timestamptz not null,
  jogadores     text[] not null default '{}',
  times         jsonb,
  placar        smallint[],
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.campeonatos (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  times     text[] not null check (array_length(times, 1) >= 2),
  criado_em timestamptz not null default now()
);

create table if not exists public.campeonato_jogos (
  id            uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonatos (id) on delete cascade,
  time_a        text not null,
  time_b        text not null,
  gols_a        smallint check (gols_a >= 0),
  gols_b        smallint check (gols_b >= 0),
  unique (campeonato_id, time_a, time_b)
);

create table if not exists public.mensagens_contato (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  email     text not null,
  mensagem  text not null default 'Sem mensagem informada',
  lida      boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.codigos_reset (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  codigo_hash text not null,
  expira_em   timestamptz not null,
  usado       boolean not null default false,
  criado_em   timestamptz not null default now()
);

create table if not exists public.auditoria (
  id           bigint generated always as identity primary key,
  tabela       text not null,
  operacao     text not null,
  dados_antes  jsonb,
  dados_depois jsonb,
  usuario_id   uuid,
  quando       timestamptz not null default now()
);

-- 3. SEGURANÇA E POLÍTICAS (RLS)
revoke all on all tables in schema public from anon, authenticated;

alter table public.administradores    enable row level security;
alter table public.usuarios           enable row level security;
alter table public.grupos             enable row level security;
alter table public.campeonatos        enable row level security;
alter table public.campeonato_jogos   enable row level security;
alter table public.mensagens_contato  enable row level security;
alter table public.codigos_reset      enable row level security;
alter table public.auditoria          enable row level security;

grant select, insert, update, delete on
  public.administradores, public.usuarios, public.grupos, public.campeonatos,
  public.campeonato_jogos, public.mensagens_contato, public.codigos_reset
  to authenticated;

grant select on public.auditoria to authenticated;

do $$
declare t text;
begin
  foreach t in array array['administradores', 'usuarios', 'grupos', 'campeonatos',
                           'campeonato_jogos', 'mensagens_contato', 'codigos_reset']
  loop
    execute format('drop policy if exists admin_total on public.%I', t);
    execute format(
      'create policy admin_total on public.%I
         for all to authenticated
         using (public.is_admin())
         with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists admin_le_auditoria on public.auditoria;
create policy admin_le_auditoria on public.auditoria
  for select to authenticated
  using (public.is_admin());

-- Visitantes podem apenas ENVIAR dados (inserir)
grant insert on
  public.usuarios, public.grupos, public.campeonatos,
  public.campeonato_jogos, public.mensagens_contato
  to anon;

drop policy if exists visitante_envia_usuario on public.usuarios;
create policy visitante_envia_usuario on public.usuarios
  for insert to anon
  with check (
    senha_hash is null
    and length(nome) between 1 and 120
    and length(email) between 3 and 254
    and email = lower(email)
  );

drop policy if exists visitante_envia_grupo on public.grupos;
create policy visitante_envia_grupo on public.grupos
  for insert to anon
  with check (
    length(nome) between 1 and 120
    and length(local) <= 200
  );

drop policy if exists visitante_envia_campeonato on public.campeonatos;
create policy visitante_envia_campeonato on public.campeonatos
  for insert to anon
  with check (
    length(nome) between 1 and 120
  );

drop policy if exists visitante_envia_jogo on public.campeonato_jogos;
create policy visitante_envia_jogo on public.campeonato_jogos
  for insert to anon
  with check (true);

drop policy if exists visitante_envia_contato on public.mensagens_contato;
create policy visitante_envia_contato on public.mensagens_contato
  for insert to anon
  with check (
    length(nome) between 1 and 120
    and length(email) between 3 and 254
    and length(mensagem) <= 2000
    and lida = false
  );

-- 4. DEFINIR O ADMINISTRADOR (substitua pelo seu ID ou execute após criar a conta no Auth)
insert into public.administradores (user_id, email)
select id, email
from auth.users
where lower(email) = 'airesvinicius11@gmail.com'
  and email_confirmed_at is not null
on conflict (user_id) do nothing;

commit;
