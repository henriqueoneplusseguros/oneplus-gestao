-- ============================================================
-- One Plus Gestão — login e senha do portal da operadora por cliente (out/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- ============================================================
alter table clientes add column if not exists portal_url text;
alter table clientes add column if not exists portal_login text;
alter table clientes add column if not exists portal_senha text;
