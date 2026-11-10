-- ============================================================
-- One Plus Gestão — Funil Consórcio + controle de acesso por perfil (nov/2026)
--
-- REGRA DE SEGURANÇA (lista de liberação):
--   * Só os e-mails com perfil 'total' em usuarios_perfis enxergam a carteira
--     (clientes, leads de saúde, financeiro, arquivos etc.).
--   * Perfil 'consorcio' enxerga SOMENTE as tabelas consorcio_*.
--   * Qualquer outra conta (inclusive uma conta nova criada no Supabase) não vê nada
--     até ser cadastrada aqui.
-- A trava é feita com políticas RESTRITIVAS, que se somam às políticas que já existem;
-- as políticas antigas não são alteradas.
-- IMPORTANTE: toda tabela nova da carteira criada no futuro precisa da mesma política
-- restritiva (rode de novo o bloco 4 depois de criar a tabela).
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run. É seguro repetir.
-- ============================================================

-- 1) Perfis de acesso (ninguém lê/escreve essa tabela pela API; só pelas funções abaixo e pelo SQL Editor)
create table if not exists public.usuarios_perfis (
  email text primary key,
  perfil text not null check (perfil in ('total','consorcio')),
  nome text,
  criado_em timestamptz default now()
);
alter table public.usuarios_perfis enable row level security;
insert into public.usuarios_perfis (email, perfil, nome) values
  ('henrique@oneplusseguros.com.br','total','Henrique'),
  ('alana@oneplusseguros.com.br','total','Alana'),
  ('kelly@oneplusseguros.com.br','total','Kelly'),
  ('agatha@oneplusseguros.com.br','total','Agatha')
on conflict (email) do nothing;

-- 2) Funções de acesso (leem o e-mail de quem está logado no token)
create or replace function public.meu_perfil() returns text
language sql stable security definer set search_path = public as $$
  select perfil from public.usuarios_perfis
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1
$$;
create or replace function public.meu_acesso() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('perfil', perfil, 'nome', nome) from public.usuarios_perfis
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1
$$;
create or replace function public.acesso_total() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_perfil() = 'total', false)
$$;
create or replace function public.acesso_consorcio() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_perfil() in ('total','consorcio'), false)
$$;
revoke all on function public.meu_perfil() from public, anon;
revoke all on function public.meu_acesso() from public, anon;
revoke all on function public.acesso_total() from public, anon;
revoke all on function public.acesso_consorcio() from public, anon;
grant execute on function public.meu_perfil() to authenticated;
grant execute on function public.meu_acesso() to authenticated;
grant execute on function public.acesso_total() to authenticated;
grant execute on function public.acesso_consorcio() to authenticated;

-- 3) Tabelas do Funil Consórcio
create table if not exists public.consorcio_leads (
  id uuid primary key default gen_random_uuid(),
  nome text,
  empresa text,
  telefone text,
  email text,
  cpf_cnpj text,
  origem text,
  vendedor text,
  etapa text not null default 'Qualificação',
  temperatura text,
  administradora text default 'Porto Seguro',
  tipo_bem text,
  valor_credito numeric(14,2),
  prazo_meses int,
  parcela_estimada numeric(12,2),
  motivo_perda text,
  retomar_em date,
  data_ganho date,
  etapa_atualizada_em timestamptz default now(),
  observacoes text,
  criado_por text,
  criado_em timestamptz default now()
);
create table if not exists public.consorcio_tarefas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.consorcio_leads(id) on delete cascade,
  titulo text not null,
  canal text,
  descricao text,
  vencimento_em timestamptz,
  status text default 'Pendente',
  concluido_em timestamptz,
  responsavel text,
  criado_por text,
  criado_em timestamptz default now()
);
create table if not exists public.consorcio_notas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.consorcio_leads(id) on delete cascade,
  texto text not null,
  autor text,
  criado_por text,
  criado_em timestamptz default now()
);
alter table public.consorcio_notas add column if not exists criado_por text;
create index if not exists consorcio_tarefas_lead_idx on public.consorcio_tarefas (lead_id);
create index if not exists consorcio_notas_lead_idx on public.consorcio_notas (lead_id);
alter table public.consorcio_leads enable row level security;
alter table public.consorcio_tarefas enable row level security;
alter table public.consorcio_notas enable row level security;
do $$
declare t text;
begin
  foreach t in array array['consorcio_leads','consorcio_tarefas','consorcio_notas'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='consorcio: equipe do consorcio') then
      execute format('create policy %I on public.%I for all to authenticated using ((select public.acesso_consorcio())) with check ((select public.acesso_consorcio()))',
        'consorcio: equipe do consorcio', t);
    end if;
  end loop;
end $$;

-- 4) Trava da carteira: política RESTRITIVA em todas as outras tabelas do schema public
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('consorcio_leads','consorcio_tarefas','consorcio_notas','usuarios_perfis')
  loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t.relname and policyname='trava: so acesso total') then
      execute format('create policy %I on public.%I as restrictive for all to public using ((select public.acesso_total())) with check ((select public.acesso_total()))',
        'trava: so acesso total', t.relname);
    end if;
  end loop;
end $$;

-- 5) Trava dos arquivos (boletos, extratos, documentos dos leads)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='trava: so acesso total') then
    create policy "trava: so acesso total" on storage.objects as restrictive for all to public
      using ((select public.acesso_total())) with check ((select public.acesso_total()));
  end if;
end $$;

-- Para liberar a Gabriela (quando o e-mail dela existir):
-- insert into public.usuarios_perfis (email, perfil, nome) values ('EMAIL_DELA','consorcio','Gabriela')
--   on conflict (email) do update set perfil = excluded.perfil, nome = excluded.nome;
