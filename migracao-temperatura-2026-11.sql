-- ============================================================
-- One Plus Gestão — temperatura do negócio no funil (nov/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- ============================================================
alter table leads add column if not exists temperatura text;  -- 'quente' | 'morno' | 'frio'
