-- ============================================================
-- One Plus Gestão — linha do tempo do negócio (nov/2026)
-- Guarda cada passo do negócio: mudança de etapa, temperatura,
-- valor/plano, tarefa alterada ou excluída.
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- ============================================================
create table if not exists lead_eventos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  tipo text not null,          -- etapa | temperatura | dados | tarefa_editada | tarefa_excluida
  descricao text,
  dados jsonb,                 -- ex.: {"de":"Proposta Enviada","para":"Ganho","motivo":null}
  autor text,
  criado_em timestamptz default now()
);
create index if not exists lead_eventos_lead_idx on lead_eventos (lead_id, criado_em);
alter table lead_eventos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'lead_eventos' and policyname = 'auth all lead_eventos') then
    create policy "auth all lead_eventos" on lead_eventos for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;
