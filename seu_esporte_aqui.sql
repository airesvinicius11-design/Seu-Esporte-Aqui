-- ============================================================
-- SEU ESPORTE AQUI — banco de dados (PostgreSQL / Supabase)
-- ------------------------------------------------------------
-- O que este arquivo faz:
--   1. Cria as tabelas que espelham os dados que o site hoje
--      guarda no localStorage (contas, grupos, campeonatos, contatos).
--   2. Tranca TUDO: só o administrador (você) lê, altera e apaga.
--      Visitantes conseguem apenas ENVIAR (cadastro, contato, grupo
--      e campeonato), sem nunca ver o que está guardado.
--   3. Registra numa tabela de auditoria cada alteração feita.
--
-- Como usar (Supabase):
--   a) Crie um projeto gratuito em supabase.com.
--   b) Em Authentication, crie sua conta com o e-mail do admin
--      e confirme o e-mail (clique no link que chegar).
--   c) Em SQL Editor, cole este arquivo inteiro e clique em Run.
--   d) Se a conta ainda não existia quando você rodou, crie-a e
--      rode de novo só o bloco "5. Definir o administrador".
--
-- Observação: as funções auth.uid() e auth.jwt() são do Supabase.
-- Em um PostgreSQL puro elas não existem.
-- ============================================================

begin;

create extension if not exists pgcrypto;


-- ============================================================
-- 1. ADMINISTRADOR
-- ============================================================
create table if not exists public.administradores (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  email     text not null unique,
  criado_em timestamptz not null default now()
);

-- Pergunta "quem está logado é admin?". Usada pelas regras de acesso.
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


-- ============================================================
-- 2. TABELAS DO SITE
-- ============================================================

-- Contas de usuários (cadastro do site)
create table if not exists public.usuarios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  idade      smallint check (idade between 1 and 120),
  email      text not null unique check (email = lower(email)),
  senha_hash text,   -- nunca guarde senha pura. Guarde só o hash.
  criado_em  timestamptz not null default now()
);

-- Grupos de partida
create table if not exists public.grupos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  esporte       text not null,
  local         text not null default 'Não informado',
  data_hora     timestamptz not null,
  jogadores     text[] not null default '{}',
  times         jsonb,        -- ex.: [["Ana","Beto"],["Caio","Duda"]]
  placar        smallint[],   -- ex.: {2,1}
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Campeonatos
create table if not exists public.campeonatos (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  times     text[] not null check (array_length(times, 1) >= 2),
  criado_em timestamptz not null default now()
);

-- Jogos de cada campeonato (todos contra todos)
create table if not exists public.campeonato_jogos (
  id            uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonatos (id) on delete cascade,
  time_a        text not null,
  time_b        text not null,
  gols_a        smallint check (gols_a >= 0),
  gols_b        smallint check (gols_b >= 0),
  unique (campeonato_id, time_a, time_b)
);

-- Mensagens da página de contato
create table if not exists public.mensagens_contato (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  email     text not null,
  mensagem  text not null default 'Sem mensagem informada',
  lida      boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Códigos de redefinição de senha (guarda só o hash do código)
create table if not exists public.codigos_reset (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  codigo_hash text not null,
  expira_em   timestamptz not null,
  usado       boolean not null default false,
  criado_em   timestamptz not null default now()
);

-- Auditoria: quem mudou o quê e quando
create table if not exists public.auditoria (
  id           bigint generated always as identity primary key,
  tabela       text not null,
  operacao     text not null,
  dados_antes  jsonb,
  dados_depois jsonb,
  usuario_id   uuid,
  quando       timestamptz not null default now()
);

create index if not exists idx_grupos_data         on public.grupos (data_hora);
create index if not exists idx_jogos_campeonato    on public.campeonato_jogos (campeonato_id);
create index if not exists idx_contato_criado      on public.mensagens_contato (criado_em desc);
create index if not exists idx_reset_email         on public.codigos_reset (email);


-- ============================================================
-- 3. TRIGGERS (data de atualização e auditoria)
-- ============================================================
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_grupos_atualizado on public.grupos;
create trigger trg_grupos_atualizado
  before update on public.grupos
  for each row execute function public.tocar_atualizado_em();

-- Grava cada INSERT/UPDATE/DELETE na auditoria (sem senhas nem códigos)
create or replace function public.registrar_alteracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auditoria (tabela, operacao, dados_antes, dados_depois, usuario_id)
  values (
    tg_table_name,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'senha_hash' end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'senha_hash' end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['usuarios', 'grupos', 'campeonatos', 'campeonato_jogos', 'mensagens_contato']
  loop
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    execute format(
      'create trigger trg_auditoria after insert or update or delete on public.%I
       for each row execute function public.registrar_alteracao()', t);
  end loop;
end $$;


-- ============================================================
-- 4. TRANCA DE SEGURANÇA (só o admin entra)
-- ============================================================
-- Passo 1: tira todo acesso de visitantes (anon) e de contas comuns.
revoke all on all tables in schema public from anon, authenticated;

-- Passo 2: liga a segurança por linha em todas as tabelas.
-- Sem nenhuma regra liberando, a tabela fica fechada.
alter table public.administradores    enable row level security;
alter table public.usuarios           enable row level security;
alter table public.grupos             enable row level security;
alter table public.campeonatos        enable row level security;
alter table public.campeonato_jogos   enable row level security;
alter table public.mensagens_contato  enable row level security;
alter table public.codigos_reset      enable row level security;
alter table public.auditoria          enable row level security;

-- Passo 3: libera o uso das tabelas só para contas logadas.
-- Mesmo assim, as regras abaixo só deixam passar o admin.
grant select, insert, update, delete on
  public.administradores, public.usuarios, public.grupos, public.campeonatos,
  public.campeonato_jogos, public.mensagens_contato, public.codigos_reset
  to authenticated;

-- A auditoria é só leitura: nem o admin consegue apagar ou editar o histórico.
grant select on public.auditoria to authenticated;

-- Passo 4: regras. Uma por tabela, todas dizendo "só se is_admin()".
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

-- Passo 5: visitantes podem apenas ENVIAR dados (cadastro, contato,
-- grupo e campeonato). Não conseguem ler, alterar nem apagar nada.
-- Cada regra limita o tamanho e o formato do que pode ser enviado.
grant insert on
  public.usuarios, public.grupos, public.campeonatos,
  public.campeonato_jogos, public.mensagens_contato
  to anon;

drop policy if exists visitante_envia_usuario on public.usuarios;
create policy visitante_envia_usuario on public.usuarios
  for insert to anon
  with check (
    senha_hash is null                      -- o site nunca manda senha
    and length(nome) between 1 and 120
    and length(email) between 3 and 254
    and email = lower(email)
    and (idade is null or idade between 1 and 120)
  );

drop policy if exists visitante_envia_grupo on public.grupos;
create policy visitante_envia_grupo on public.grupos
  for insert to anon
  with check (
    length(nome) between 1 and 120
    and length(local) <= 200
    and cardinality(jogadores) <= 100
    and times is null and placar is null
  );

drop policy if exists visitante_envia_campeonato on public.campeonatos;
create policy visitante_envia_campeonato on public.campeonatos
  for insert to anon
  with check (
    length(nome) between 1 and 120
    and cardinality(times) <= 64
  );

drop policy if exists visitante_envia_jogo on public.campeonato_jogos;
create policy visitante_envia_jogo on public.campeonato_jogos
  for insert to anon
  with check (
    gols_a is null and gols_b is null
    and length(time_a) <= 120 and length(time_b) <= 120
  );

drop policy if exists visitante_envia_contato on public.mensagens_contato;
create policy visitante_envia_contato on public.mensagens_contato
  for insert to anon
  with check (
    length(nome) between 1 and 120
    and length(email) between 3 and 254
    and length(mensagem) <= 2000
    and lida = false
  );


-- ============================================================
-- 5. DEFINIR O ADMINISTRADOR
-- ============================================================
-- Procura a conta já criada e confirmada no Supabase Auth.
-- Se ainda não existir, não dá erro: é só rodar de novo depois.
insert into public.administradores (user_id, email)
select id, email
from auth.users
where lower(email) = 'airesvinicius11@gmail.com'
  and email_confirmed_at is not null
on conflict (user_id) do nothing;


-- ============================================================
-- 6. PAINEL RESUMIDO (só o admin enxerga)
-- ============================================================
create or replace view public.painel_admin
with (security_invoker = true) as
select
  (select count(*) from public.usuarios)                                  as total_usuarios,
  (select count(*) from public.grupos)                                    as total_grupos,
  (select count(*) from public.campeonatos)                               as total_campeonatos,
  (select count(*) from public.mensagens_contato where not lida)          as contatos_nao_lidos;

grant select on public.painel_admin to authenticated;

commit;


-- ============================================================
-- CONSULTAS ÚTEIS (rode logado como admin)
-- ============================================================
-- select * from public.painel_admin;
-- select * from public.mensagens_contato where not lida order by criado_em desc;
-- update public.mensagens_contato set lida = true where id = '...';
-- select * from public.auditoria order by quando desc limit 50;
-- delete from public.grupos where id = '...';
