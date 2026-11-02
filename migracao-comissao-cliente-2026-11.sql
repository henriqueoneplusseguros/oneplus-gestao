-- ============================================================
-- One Plus Gestão — comissão por cliente: o que já entrou e o que falta (nov/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- {p1|p2|p3:{status:'recebida'|'a_receber'|'nao_tem', mes:'AAAA-MM'}, vitalicio:bool, vitalicio_inicio:'AAAA-MM'}
-- ============================================================
alter table clientes add column if not exists comissao_parcelas jsonb;
