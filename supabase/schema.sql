-- =====================================================================
-- Painel de senhas divergentes: tabelas do banco de dados (Supabase)
--
-- COMO USAR (uma vez só):
--   1. No Supabase, abra o projeto > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em Run.
--   3. Em Authentication > Users > Add user > Create new user, crie o usuário
--      do time (divergencias@assai.com) com uma senha, marcando "Auto Confirm User".
--   4. Em Authentication > Sign In / Providers, desligue
--      "Allow new users to sign up", para ninguém de fora criar conta.
--
-- Pode rodar de novo sem problema: nada é apagado.
-- =====================================================================

-- Cada senha + NF é uma linha. "dados" guarda o registro como o painel usa.
create table if not exists public.registros (
  id           text primary key,                -- "senha|NF"
  dados        jsonb not null,
  alterado     timestamptz not null default now(),
  alterado_por text                             -- e-mail de quem alterou por último
);
create index if not exists registros_alterado_idx on public.registros (alterado);

-- Regras "fornecedor -> categoria" criadas na aba Categorias
create table if not exists public.regras (
  forn_chave   text primary key,                -- nome do fornecedor normalizado
  dados        jsonb not null,
  alterado     timestamptz not null default now(),
  alterado_por text
);
create index if not exists regras_alterado_idx on public.regras (alterado);

-- Resumo do arquivo de produtos (fornecedor, categoria, CNPJ e quantidade de produtos). Uma linha só.
create table if not exists public.produtos (
  id           int primary key default 1 check (id = 1),
  nome         text,
  colunas      text,
  resumo       jsonb not null default '[]'::jsonb,
  alterado     timestamptz not null default now(),
  alterado_por text
);

-- Carimbo: hora do servidor e e-mail de quem gravou, em toda inclusão e alteração
create or replace function public.carimbar_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.alterado := now();
  new.alterado_por := coalesce(auth.jwt() ->> 'email', new.alterado_por);
  return new;
end;
$$;

drop trigger if exists carimbo on public.registros;
create trigger carimbo before insert or update on public.registros
  for each row execute function public.carimbar_alteracao();
drop trigger if exists carimbo on public.regras;
create trigger carimbo before insert or update on public.regras
  for each row execute function public.carimbar_alteracao();
drop trigger if exists carimbo on public.produtos;
create trigger carimbo before insert or update on public.produtos
  for each row execute function public.carimbar_alteracao();

-- Acesso: só quem entrou com login (usuário do time) lê, inclui e altera. Ninguém apaga pelo painel.
alter table public.registros enable row level security;
alter table public.regras    enable row level security;
alter table public.produtos  enable row level security;

drop policy if exists "time le"     on public.registros;
drop policy if exists "time inclui" on public.registros;
drop policy if exists "time altera" on public.registros;
create policy "time le"     on public.registros for select to authenticated using (true);
create policy "time inclui" on public.registros for insert to authenticated with check (true);
create policy "time altera" on public.registros for update to authenticated using (true) with check (true);

drop policy if exists "time le"     on public.regras;
drop policy if exists "time inclui" on public.regras;
drop policy if exists "time altera" on public.regras;
create policy "time le"     on public.regras for select to authenticated using (true);
create policy "time inclui" on public.regras for insert to authenticated with check (true);
create policy "time altera" on public.regras for update to authenticated using (true) with check (true);

drop policy if exists "time le"     on public.produtos;
drop policy if exists "time inclui" on public.produtos;
drop policy if exists "time altera" on public.produtos;
create policy "time le"     on public.produtos for select to authenticated using (true);
create policy "time inclui" on public.produtos for insert to authenticated with check (true);
create policy "time altera" on public.produtos for update to authenticated using (true) with check (true);

revoke all on public.registros, public.regras, public.produtos from anon;
grant select, insert, update on public.registros, public.regras, public.produtos to authenticated;
