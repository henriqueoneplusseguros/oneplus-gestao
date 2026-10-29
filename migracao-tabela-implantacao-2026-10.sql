-- One Plus Gestão — tabela comercializada já na implantação (out/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole > Run. Não apaga nada.
alter table tabelas_precos_cliente add column if not exists lead_id uuid references leads(id) on delete set null;
alter table tabelas_precos_cliente alter column cliente_id drop not null;
create index if not exists tabelas_precos_cliente_lead_idx on tabelas_precos_cliente(lead_id);
