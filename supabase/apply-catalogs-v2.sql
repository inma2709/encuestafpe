-- Pegar TODO este archivo en Supabase → SQL Editor → Run
-- Catálogos v2 + tipo select

create table if not exists public.provinces (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  ine_code text not null unique,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.professional_families (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  slug text not null unique,
  position int not null,
  created_at timestamptz not null default now()
);

alter table public.question_options
  add column if not exists province_id uuid references public.provinces (id) on delete set null;

alter table public.question_options
  add column if not exists professional_family_id uuid references public.professional_families (id) on delete set null;

create index if not exists provinces_region_id_idx on public.provinces (region_id);
create index if not exists question_options_province_id_idx on public.question_options (province_id);
create index if not exists question_options_family_id_idx on public.question_options (professional_family_id);

alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions
  add constraint questions_type_check
  check (type in ('single', 'multi', 'likert', 'text', 'number', 'select'));

alter table public.provinces enable row level security;
alter table public.professional_families enable row level security;

drop policy if exists "provinces_select_public" on public.provinces;
create policy "provinces_select_public"
  on public.provinces for select
  to anon, authenticated
  using (true);

drop policy if exists "families_select_public" on public.professional_families;
create policy "families_select_public"
  on public.professional_families for select
  to anon, authenticated
  using (true);
