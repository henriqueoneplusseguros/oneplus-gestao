-- ============================================================
-- One Plus Gestão — troca de plano na Implantação + relatórios (out/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- ============================================================

-- Início de vigência do contrato (pode mudar quando a operadora recusa e troca o plano)
alter table leads add column if not exists vigencia_inicio date;

-- Histórico de trocas de operadora / plano / valor / vigência durante a implantação
alter table implantacoes add column if not exists historico_plano jsonb default '[]'::jsonb;
