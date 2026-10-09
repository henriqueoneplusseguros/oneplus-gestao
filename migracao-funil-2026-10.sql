-- ============================================================
-- One Plus Gestão — atualização do Funil (out/2026)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- É seguro rodar de novo: nada é apagado.
-- ============================================================

-- 1) Contato e idades no negócio (funil comercial)
alter table leads add column if not exists email text;
alter table leads add column if not exists telefone text;
alter table leads add column if not exists idades jsonb default '[]'::jsonb;

-- 2) Documentos do negócio (propostas, cotações enviadas)
create table if not exists lead_anexos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  nome_arquivo text not null,
  path text not null,
  tamanho bigint,
  tipo text,
  criado_por text,
  criado_em timestamptz default now()
);
alter table lead_anexos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'lead_anexos' and policyname = 'auth all lead_anexos') then
    create policy "auth all lead_anexos" on lead_anexos for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

-- 3) Pasta privada para os arquivos (só quem está logado vê)
insert into storage.buckets (id, name, public)
values ('leads', 'leads', false)
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'auth all leads storage') then
    create policy "auth all leads storage" on storage.objects for all
      using (bucket_id = 'leads' and auth.role() = 'authenticated')
      with check (bucket_id = 'leads' and auth.role() = 'authenticated');
  end if;
end $$;
