-- ============================================================
-- One Plus Gestão — contatos futuros (retomar leads perdidos) (nov/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- ============================================================
alter table leads add column if not exists retomar_em date;
alter table leads add column if not exists retomar_obs text;
alter table leads add column if not exists retomado_em timestamptz;
