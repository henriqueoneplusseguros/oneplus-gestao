-- ============================================================
-- One Plus Gestão — Central das Operadoras + link de pós-venda (nov/2026)
-- Rode UMA vez no Supabase (SQL Editor). É seguro repetir.
-- Segurança:
--   * operadoras_central: só a equipe com acesso total (mesma trava da carteira).
--   * Link de pós-venda público: o cliente NÃO lê a tabela. Ele só chama a função
--     posvenda_operadora(slug), que devolve apenas os contatos/links de atendimento
--     da operadora marcada como "publicar", sem nenhum dado de cliente.
-- ============================================================
create table if not exists public.operadoras_central (
  id uuid primary key default gen_random_uuid(),
  operadora text not null unique,
  slug text not null unique,
  -- atendimento (vai para o link de pós-venda)
  site text, central_telefone text, whatsapp text, app_android text, app_ios text,
  teleconsulta text, reembolso text, segunda_via text, rede_link text, carteirinha_info text,
  publicar_posvenda boolean default false,
  -- uso interno (dúvidas comerciais)
  comercializacao text, rede_credenciada text, carencia text, documentacao text,
  diferenciais text, observacoes text, limite_idade text,
  materiais jsonb default '[]'::jsonb,
  atualizado_em timestamptz default now(), atualizado_por text, criado_em timestamptz default now()
);
alter table public.operadoras_central enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='operadoras_central' and policyname='auth all operadoras_central') then
    create policy "auth all operadoras_central" on public.operadoras_central for all
      using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='operadoras_central' and policyname='trava: so acesso total') then
    create policy "trava: so acesso total" on public.operadoras_central as restrictive for all to public
      using ((select public.acesso_total())) with check ((select public.acesso_total()));
  end if;
end $$;

create or replace function public.posvenda_operadora(p_slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('operadora', operadora, 'site', site, 'central_telefone', central_telefone, 'whatsapp', whatsapp,
    'app_android', app_android, 'app_ios', app_ios, 'teleconsulta', teleconsulta, 'reembolso', reembolso,
    'segunda_via', segunda_via, 'rede_link', rede_link, 'carteirinha_info', carteirinha_info, 'atualizado_em', atualizado_em)
  from public.operadoras_central where slug = lower(p_slug) and publicar_posvenda = true limit 1
$$;
revoke all on function public.posvenda_operadora(text) from public;
grant execute on function public.posvenda_operadora(text) to anon, authenticated;

-- Arquivos da central (tabelas, materiais em PDF): bucket privado; a trava de storage já limita à equipe total.
insert into storage.buckets (id, name, public) values ('operadoras', 'operadoras', false) on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='auth all operadoras storage') then
    create policy "auth all operadoras storage" on storage.objects for all
      using (bucket_id = 'operadoras' and auth.role() = 'authenticated') with check (bucket_id = 'operadoras' and auth.role() = 'authenticated');
  end if;
end $$;
