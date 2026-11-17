-- One Plus Gestão — nova oportunidade a partir de um cliente da carteira (nov/2026)
-- Liga o negócio do funil ao cliente de onde ele saiu. O cliente atual não é alterado.
-- Rode UMA vez no Supabase (SQL Editor). É seguro repetir.
alter table public.leads add column if not exists cliente_origem_id uuid references public.clientes(id) on delete set null;
create index if not exists leads_cliente_origem_idx on public.leads (cliente_origem_id);
