-- Observatorio FPE — esquema núcleo V1
-- Extensiones
create extension if not exists "pgcrypto";

-- Territorio
create table public.regions (
  id uuid primary key default gen_random_uuid(),
  ine_code text not null unique,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.provinces (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  ine_code text not null unique,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.professional_families (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  slug text not null unique,
  position int not null,
  created_at timestamptz not null default now()
);

-- Estudios
create table public.studies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_waves (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies (id) on delete cascade,
  label text not null,
  opens_at timestamptz,
  closes_at timestamptz,
  is_open boolean not null default false,
  created_at timestamptz not null default now(),
  unique (study_id, label)
);

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.survey_versions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  version_label text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (survey_id, version_label)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  survey_version_id uuid not null references public.survey_versions (id) on delete cascade,
  code text not null,
  type text not null
    check (type in ('single', 'multi', 'likert', 'text', 'number', 'select')),
  label text not null,
  help_text text,
  position int not null,
  is_required boolean not null default true,
  is_active boolean not null default true,
  min_value int,
  max_value int,
  created_at timestamptz not null default now(),
  unique (survey_version_id, code),
  unique (survey_version_id, position)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  code text not null,
  label text not null,
  position int not null,
  region_id uuid references public.regions (id) on delete set null,
  province_id uuid references public.provinces (id) on delete set null,
  professional_family_id uuid references public.professional_families (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (question_id, code),
  unique (question_id, position)
);

create table public.response_sessions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies (id) on delete restrict,
  wave_id uuid not null references public.study_waves (id) on delete restrict,
  survey_version_id uuid not null references public.survey_versions (id) on delete restrict,
  unlock_token_hash text not null unique,
  completed_at timestamptz not null default now(),
  duration_ms int,
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.response_sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  option_id uuid references public.question_options (id) on delete restrict,
  value_text text,
  value_number numeric,
  created_at timestamptz not null default now(),
  constraint answers_has_value check (
    option_id is not null
    or value_text is not null
    or value_number is not null
  )
);

create index answers_session_id_idx on public.answers (session_id);
create index answers_question_id_idx on public.answers (question_id);
create index response_sessions_wave_id_idx on public.response_sessions (wave_id);
create index response_sessions_version_id_idx on public.response_sessions (survey_version_id);
create index question_options_region_id_idx on public.question_options (region_id);
create index question_options_province_id_idx on public.question_options (province_id);
create index question_options_family_id_idx on public.question_options (professional_family_id);
create index provinces_region_id_idx on public.provinces (region_id);

-- Solo una versión activa por survey
create unique index survey_versions_one_active_per_survey
  on public.survey_versions (survey_id)
  where is_active = true;

-- Solo una wave abierta por estudio (opcional pero útil)
create unique index study_waves_one_open_per_study
  on public.study_waves (study_id)
  where is_open = true;

-- RLS
alter table public.regions enable row level security;
alter table public.provinces enable row level security;
alter table public.professional_families enable row level security;
alter table public.studies enable row level security;
alter table public.study_waves enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_versions enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.response_sessions enable row level security;
alter table public.answers enable row level security;

-- Lectura pública del instrumento (anon)
create policy "regions_select_public"
  on public.regions for select
  to anon, authenticated
  using (true);

create policy "provinces_select_public"
  on public.provinces for select
  to anon, authenticated
  using (true);

create policy "families_select_public"
  on public.professional_families for select
  to anon, authenticated
  using (true);

create policy "studies_select_public"
  on public.studies for select
  to anon, authenticated
  using (status in ('open', 'closed'));

create policy "waves_select_public"
  on public.study_waves for select
  to anon, authenticated
  using (true);

create policy "surveys_select_public"
  on public.surveys for select
  to anon, authenticated
  using (true);

create policy "versions_select_public"
  on public.survey_versions for select
  to anon, authenticated
  using (true);

create policy "questions_select_public"
  on public.questions for select
  to anon, authenticated
  using (is_active = true);

create policy "options_select_public"
  on public.question_options for select
  to anon, authenticated
  using (is_active = true);

-- Microdatos: sin select público
-- Inserts de respuestas: solo via service role desde el servidor (sin policies de insert para anon)
