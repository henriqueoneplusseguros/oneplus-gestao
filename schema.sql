-- One Plus Gestão — schema Supabase (Postgres)
-- Rode isto inteiro em: Supabase > SQL Editor > New query > Run

create extension if not exists pgcrypto;

-- ========== CLIENTES ==========
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  titular_nome text not null,
  razao_social text,
  cnpj_cpf text,
  email text,
  telefone text,
  cpf text,
  data_nascimento date,
  produto text,               -- Saúde / Vida / Consórcio
  plano_nome text,             -- nome comercial do plano (ex: Amil Black)
  numero_carteirinha text,
  vendedor text,
  valor_por_beneficiario numeric(12,2),
  valor_contrato_total numeric(12,2),
  bonus_parcela4 numeric(12,2) default 0,
  data_inclusao date,
  vigencia_inicio date,
  vigencia_fim date,
  data_fechamento date,        -- usada no cálculo de comissão (parcelas)
  ultima_revisao date,
  status text default 'Ativo', -- Ativo / Cancelado
  dados_bancarios jsonb,        -- {banco, agencia, conta, tipo_conta, pix}
  observacoes text,
  criado_por text,
  criado_em timestamptz default now()
);

create table if not exists dependentes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  nome text not null,
  cpf text,
  data_nascimento date,
  numero_carteirinha text,
  valor_beneficiario numeric(12,2),
  criado_em timestamptz default now()
);

-- ========== TAREFAS / DEMANDAS / INCLUSÕES / EXCLUSÕES ==========
create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'Tarefa',  -- Tarefa / Demanda / Inclusão / Exclusão
  titulo text not null,
  descricao text,
  cliente_id uuid references clientes(id) on delete set null,
  beneficiario_nome text,
  responsavel text,
  data_vencimento date,
  status text default 'Pendente',        -- Pendente / Em andamento / Concluída
  criado_por text,
  criado_em timestamptz default now()
);

-- ========== REEMBOLSOS ==========
create table if not exists reembolsos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  beneficiario_nome text,
  descricao text,
  valor_solicitado numeric(12,2),
  data_solicitacao date,
  status text default 'Solicitado', -- Solicitado / Em análise / Aprovado / Pago / Negado
  observacoes text,
  criado_por text,
  criado_em timestamptz default now()
);

-- ========== AGENDAMENTOS (consultas / exames) ==========
create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  beneficiario_nome text,
  tipo text default 'Consulta',   -- Consulta / Exame
  especialidade text,
  data_hora timestamptz,
  local text,
  status text default 'Agendado', -- Agendado / Realizado / Cancelado
  observacoes text,
  criado_por text,
  criado_em timestamptz default now()
);

-- ========== FUNIL COMERCIAL ==========
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  nome text,
  empresa text,
  produto text,
  vendedor text,
  valor_estimado numeric(12,2),
  origem text,
  etapa text default 'Qualificação',
  observacoes text,
  criado_por text,
  criado_em timestamptz default now()
);

-- ========== PÓS-VENDA (interações) ==========
create table if not exists interacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  cliente_nome text,
  data date,
  canal text,
  tipo text,
  nota text,
  autor text,
  criado_em timestamptz default now()
);

-- ========== PARÂMETROS ==========
create table if not exists params (
  id int primary key default 1,
  taxa_imposto numeric(6,4) default 0.085,
  percentual_vitalicio numeric(6,4) default 0.02,
  parcelas_cheias int default 3,
  meta_mensal_padrao numeric(12,2) default 0,
  constraint params_singleton check (id = 1)
);
insert into params (id) values (1) on conflict (id) do nothing;

-- ========== SEGURANÇA (Row Level Security) ==========
-- Qualquer pessoa AUTENTICADA (login feito) pode ler/gravar.
-- Ninguém sem login acessa nada. Ajuste depois se quiser permissões mais finas por pessoa.
alter table clientes enable row level security;
alter table dependentes enable row level security;
alter table tarefas enable row level security;
alter table reembolsos enable row level security;
alter table agendamentos enable row level security;
alter table leads enable row level security;
alter table interacoes enable row level security;
alter table params enable row level security;

create policy "auth read clientes" on clientes for select using (auth.role() = 'authenticated');
create policy "auth write clientes" on clientes for insert with check (auth.role() = 'authenticated');
create policy "auth update clientes" on clientes for update using (auth.role() = 'authenticated');
create policy "auth delete clientes" on clientes for delete using (auth.role() = 'authenticated');

create policy "auth all dependentes" on dependentes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all tarefas" on tarefas for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all reembolsos" on reembolsos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all agendamentos" on agendamentos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all leads" on leads for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all interacoes" on interacoes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all params" on params for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ========== DADOS DE EXEMPLO (apague quando cadastrar os reais) ==========
insert into clientes (titular_nome, razao_social, cnpj_cpf, email, telefone, cpf, data_nascimento, produto, plano_nome, numero_carteirinha, vendedor, valor_por_beneficiario, valor_contrato_total, data_inclusao, vigencia_inicio, data_fechamento, status, criado_por)
values (
  'João Ricardo Almeida (exemplo — apague)', 'Almeida Comércio Ltda', '12.345.678/0001-90',
  'joao@exemplo.com', '(11) 99999-0000', '123.456.789-00', '1985-03-22',
  'Saúde', 'Amil Black', '0001234567', 'Alana',
  2450.00, 2450.00, '2026-06-10', '2026-06-10', '2026-06-10', 'Ativo', 'One Plus'
);

-- ===================================================================
-- Migração aplicada em 2026-09-10 (recursos: múltiplos titulares,
-- endereço/CEP, vigência 12/24 meses, reajuste, tarefas do funil,
-- meta de vendas mensal). Já executada em produção via SQL Editor.
-- ===================================================================

-- Titulares adicionais / dependentes
alter table dependentes add column if not exists tipo text not null default 'Dependente';

-- Endereco em clientes (CEP automatico)
alter table clientes add column if not exists cep text;
alter table clientes add column if not exists endereco_rua text;
alter table clientes add column if not exists endereco_numero text;
alter table clientes add column if not exists endereco_complemento text;
alter table clientes add column if not exists endereco_bairro text;
alter table clientes add column if not exists endereco_cidade text;
alter table clientes add column if not exists endereco_uf text;

-- Vigencia 12/24 meses
alter table clientes add column if not exists duracao_contrato_meses int default 12;

-- Reajuste
alter table clientes add column if not exists percentual_reajuste numeric(6,2);
alter table clientes add column if not exists data_ultimo_reajuste date;

-- Tarefas ligadas ao funil, com data e hora e canal
alter table tarefas add column if not exists lead_id uuid references leads(id) on delete cascade;
alter table tarefas add column if not exists vencimento_em timestamptz;
alter table tarefas add column if not exists canal text;

-- Meta de vendas (contagem) no funil
alter table params add column if not exists meta_vendas_mensal int default 0;


-- ===================================================================
-- Migração 2026-09-10 (parte 2): tabelas que o app.js já usa
-- (metas mensais, implantação e equipe) mas que faltavam neste
-- schema.sql — e a coluna que liga um cliente ao lead que o originou.
-- Todos os comandos abaixo são seguros de rodar de novo (idempotentes).
-- ===================================================================

-- Liga o cliente ao negócio do funil que deu origem a ele
alter table clientes add column if not exists lead_id uuid references leads(id) on delete set null;

-- ========== METAS MENSAIS (meta de vendas em R$, editável mês a mês) ==========
create table if not exists metas_mensais (
    id uuid primary key default gen_random_uuid(),
    mes text not null unique,       -- formato "AAAA-MM"
  valor_meta numeric(12,2) default 0,
    criado_em timestamptz default now()
  );

-- ========== IMPLANTAÇÃO (checklist pós-fechamento de cada negócio ganho) ==========
create table if not exists implantacoes (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid references leads(id) on delete cascade,
    responsavel text default 'Kelly',
    documentos_solicitados boolean default false,
    subiu_operadora boolean default false,
    implantacao_confirmada boolean default false,
    boleto_mes_referencia text,
    observacoes text,
    criado_por text,
    criado_em timestamptz default now()
  );

-- ========== EQUIPE (nome ⇄ e-mail de login, usado para saber quem está logado) ==========
create table if not exists equipe (
    id uuid primary key default gen_random_uuid(),
    nome text not null unique,
    email text,
    criado_em timestamptz default now()
  );

alter table metas_mensais enable row level security;
alter table implantacoes enable row level security;
alter table equipe enable row level security;

create policy "auth all metas_mensais" on metas_mensais for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all implantacoes" on implantacoes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all equipe" on equipe for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');


-- ===================================================================
-- Migração 2026-09-10 (parte 3): quadro kanban de tarefas + tarefas
-- concluídas somem da lista/kanban automaticamente após 10 dias.
-- ===================================================================

-- Guarda quando a tarefa foi marcada como concluída, para o sistema
-- saber quando escondê-la (10 dias depois). Fica null se a tarefa
-- não está concluída, ou se foi concluída antes desta atualização.
alter table tarefas add column if not exists concluido_em timestamptz;
