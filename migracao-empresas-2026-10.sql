-- ============================================================
-- One Plus Gestão — base de Empresas (migração do Agendor, out/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- ============================================================

-- 1) Empresas
create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  agendor_id bigint unique,
  nome text not null,
  razao_social text,
  cnpj text,
  email text,
  telefone text,
  website text,
  instagram text,
  linkedin text,
  facebook text,
  responsavel text,
  categoria text,
  origem text,
  setor text,
  ranking int,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  plano_atual text,
  valor_plano_atual text,
  novo_plano text,
  valor_novo_plano numeric(12,2),
  socio_1 text,
  socio_2 text,
  cnpj_adicional text,
  nome_contato text,
  porte text,
  representante_legal text,
  numero_vidas int,
  beneficiarios text,
  vigencia text,
  coparticipacao text,
  produtos text,
  ultima_atividade text,
  ultima_atividade_em timestamptz,
  proxima_atividade text,
  proxima_atividade_em timestamptz,
  observacoes text,
  agendor_criado_em timestamptz,
  agendor_atualizado_em timestamptz,
  dados_agendor jsonb,
  criado_por text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz
);
create index if not exists empresas_cnpj_idx on empresas (cnpj);
create index if not exists empresas_nome_idx on empresas (nome);

-- 2) Pessoas / contatos (ligados ou não a uma empresa)
create table if not exists empresa_contatos (
  id uuid primary key default gen_random_uuid(),
  agendor_id bigint unique,
  agendor_empresa_id bigint,
  empresa_id uuid references empresas(id) on delete set null,
  nome text not null,
  cargo text,
  cpf text,
  email text,
  telefone text,
  aniversario text,
  responsavel text,
  categoria text,
  origem text,
  produtos text,
  observacoes text,
  agendor_criado_em timestamptz,
  dados_agendor jsonb,
  criado_por text,
  criado_em timestamptz default now()
);
create index if not exists empresa_contatos_empresa_idx on empresa_contatos (empresa_id);

-- 3) Histórico de negócios que estavam no Agendor (somente consulta)
create table if not exists empresa_negocios_agendor (
  id uuid primary key default gen_random_uuid(),
  agendor_id bigint unique,
  agendor_empresa_id bigint,
  agendor_contato_id bigint,
  empresa_id uuid references empresas(id) on delete set null,
  contato_id uuid references empresa_contatos(id) on delete set null,
  empresa_nome text,
  contato_nome text,
  titulo text,
  valor numeric(12,2),
  status text,
  etapa text,
  funil text,
  responsavel text,
  data_inicio date,
  data_fim timestamptz,
  motivo_perda text,
  n_vidas text,
  plano_contratado text,
  data_vigencia text,
  informacoes text,
  produtos text,
  agendor_criado_em timestamptz,
  dados_agendor jsonb,
  criado_por text,
  criado_em timestamptz default now()
);
create index if not exists empresa_negocios_empresa_idx on empresa_negocios_agendor (empresa_id);

-- 4) Negócio do funil ligado a uma empresa
alter table leads add column if not exists empresa_id uuid references empresas(id) on delete set null;

-- 5) Segurança: só quem está logado lê/escreve
alter table empresas enable row level security;
alter table empresa_contatos enable row level security;
alter table empresa_negocios_agendor enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'empresas' and policyname = 'auth all empresas') then
    create policy "auth all empresas" on empresas for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'empresa_contatos' and policyname = 'auth all empresa_contatos') then
    create policy "auth all empresa_contatos" on empresa_contatos for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'empresa_negocios_agendor' and policyname = 'auth all empresa_negocios_agendor') then
    create policy "auth all empresa_negocios_agendor" on empresa_negocios_agendor for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

-- 6) Liga contatos e negócios às empresas pelo ID do Agendor
--    (rode de novo depois da importação; é seguro repetir)
create or replace function vincular_agendor() returns void language sql security invoker as $$
  update empresa_contatos c set empresa_id = e.id
    from empresas e where c.empresa_id is null and c.agendor_empresa_id = e.agendor_id;
  update empresa_negocios_agendor n set empresa_id = e.id
    from empresas e where n.empresa_id is null and n.agendor_empresa_id = e.agendor_id;
  update empresa_negocios_agendor n set contato_id = c.id
    from empresa_contatos c where n.contato_id is null and n.agendor_contato_id = c.agendor_id;
$$;
grant execute on function vincular_agendor() to authenticated;
