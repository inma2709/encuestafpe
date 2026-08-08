-- ========================================================================
-- OBSERVATORIO FPE — ESQUEMA COMPLETO
-- Ejecutar en el editor SQL de Supabase Dashboard después de borrar la DB
-- ========================================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ========================================================================
-- CATÁLOGOS TERRITORIALES Y FAMILIAS PROFESIONALES
-- ========================================================================

-- Comunidades Autónomas (19 regiones)
create table public.regions (
  id uuid primary key default gen_random_uuid(),
  ine_code text not null unique,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Provincias (52 provincias)
create table public.provinces (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  ine_code text not null unique,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Familias profesionales (26 familias)
create table public.professional_families (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  slug text not null unique,
  position int not null,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- NÚCLEO PRINCIPAL: ESTUDIOS Y ENCUESTAS
-- ========================================================================

-- Estudios (proyectos de investigación)
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

-- Oleadas de recogida de datos por estudio
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

-- Encuestas asociadas a estudios
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

-- Versiones de encuestas (permite evolutivos)
create table public.survey_versions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  version_label text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (survey_id, version_label)
);

-- ========================================================================
-- INSTRUMENTOS: PREGUNTAS Y OPCIONES
-- ========================================================================

-- Preguntas del cuestionario
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

-- Opciones de respuesta (para preguntas con opciones)
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

-- ========================================================================
-- MICRODATOS: RESPUESTAS ANÓNIMAS
-- ========================================================================

-- Sesiones de respuesta anónimas
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

-- Respuestas individuales a preguntas
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

-- ========================================================================
-- ÍNDICES PARA RENDIMIENTO
-- ========================================================================

create index answers_session_id_idx on public.answers (session_id);
create index answers_question_id_idx on public.answers (question_id);
create index response_sessions_wave_id_idx on public.response_sessions (wave_id);
create index response_sessions_version_id_idx on public.response_sessions (survey_version_id);
create index question_options_region_id_idx on public.question_options (region_id);
create index question_options_province_id_idx on public.question_options (province_id);
create index question_options_family_id_idx on public.question_options (professional_family_id);
create index provinces_region_id_idx on public.provinces (region_id);

-- ========================================================================
-- CONSTRAINTS ÚNICOS PARA INTEGRIDAD
-- ========================================================================

-- Solo una versión activa por encuesta
create unique index survey_versions_one_active_per_survey
  on public.survey_versions (survey_id)
  where is_active = true;

-- Solo una oleada abierta por estudio
create unique index study_waves_one_open_per_study
  on public.study_waves (study_id)
  where is_open = true;

-- ========================================================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================================================

-- Activar RLS en todas las tablas
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

-- ========================================================================
-- POLÍTICAS DE ACCESO PÚBLICO A INSTRUMENTOS
-- ========================================================================

-- Catálogos: lectura pública
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

-- Estudios: solo visibles si están abiertos o cerrados (no drafts)
create policy "studies_select_public"
  on public.studies for select
  to anon, authenticated
  using (status in ('open', 'closed'));

-- Oleadas: lectura pública
create policy "waves_select_public"
  on public.study_waves for select
  to anon, authenticated
  using (true);

-- Encuestas: lectura pública
create policy "surveys_select_public"
  on public.surveys for select
  to anon, authenticated
  using (true);

-- Versiones: lectura pública
create policy "versions_select_public"
  on public.survey_versions for select
  to anon, authenticated
  using (true);

-- Preguntas: solo activas son públicas
create policy "questions_select_public"
  on public.questions for select
  to anon, authenticated
  using (is_active = true);

-- Opciones: solo activas son públicas
create policy "options_select_public"
  on public.question_options for select
  to anon, authenticated
  using (is_active = true);

-- Microdatos: SIN acceso público (solo service role desde SSR)
-- No hay policies de INSERT para anon/authenticated
-- Las respuestas se insertan desde el servidor con service_role_key

-- ========================================================================
-- SEED INICIAL: 19 COMUNIDADES AUTÓNOMAS
-- ========================================================================

insert into public.regions (id, ine_code, name, slug) values
  ('a1000000-0000-4000-8000-000000000001', '01', 'Andalucía', 'andalucia'),
  ('a1000000-0000-4000-8000-000000000002', '02', 'Aragón', 'aragon'),
  ('a1000000-0000-4000-8000-000000000003', '03', 'Asturias, Principado de', 'asturias'),
  ('a1000000-0000-4000-8000-000000000004', '04', 'Balears, Illes', 'islas-baleares'),
  ('a1000000-0000-4000-8000-000000000005', '05', 'Canarias', 'canarias'),
  ('a1000000-0000-4000-8000-000000000006', '06', 'Cantabria', 'cantabria'),
  ('a1000000-0000-4000-8000-000000000007', '07', 'Castilla y León', 'castilla-y-leon'),
  ('a1000000-0000-4000-8000-000000000008', '08', 'Castilla-La Mancha', 'castilla-la-mancha'),
  ('a1000000-0000-4000-8000-000000000009', '09', 'Cataluña', 'cataluna'),
  ('a1000000-0000-4000-8000-000000000010', '10', 'Comunitat Valenciana', 'comunitat-valenciana'),
  ('a1000000-0000-4000-8000-000000000011', '11', 'Extremadura', 'extremadura'),
  ('a1000000-0000-4000-8000-000000000012', '12', 'Galicia', 'galicia'),
  ('a1000000-0000-4000-8000-000000000013', '13', 'Madrid, Comunidad de', 'madrid'),
  ('a1000000-0000-4000-8000-000000000014', '14', 'Murcia, Región de', 'murcia'),
  ('a1000000-0000-4000-8000-000000000015', '15', 'Navarra, Comunidad Foral de', 'navarra'),
  ('a1000000-0000-4000-8000-000000000016', '16', 'País Vasco', 'pais-vasco'),
  ('a1000000-0000-4000-8000-000000000017', '17', 'Rioja, La', 'la-rioja'),
  ('a1000000-0000-4000-8000-000000000018', '18', 'Ceuta', 'ceuta'),
  ('a1000000-0000-4000-8000-000000000019', '19', 'Melilla', 'melilla');

-- ========================================================================
-- SEED INICIAL: ESTUDIO DOCENTES FPE 2026
-- ========================================================================

insert into public.studies (id, slug, title, summary, status) values (
  'b1000000-0000-4000-8000-000000000001',
  'docentes-fpe-2026',
  'Estudio sobre la situación de los docentes de Formación Profesional para el Empleo',
  'Primera oleada del Observatorio de la Formación Profesional para el Empleo. Encuesta anónima dirigida a docentes que imparten FPE en España.',
  'open'
);

insert into public.study_waves (id, study_id, label, opens_at, is_open) values (
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  '2026-01',
  now(),
  true
);

insert into public.surveys (id, study_id, title) values (
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000001',
  'Cuestionario docentes FPE 2026'
);

insert into public.survey_versions (id, survey_id, version_label, is_active) values (
  'b1000000-0000-4000-8000-000000000004',
  'b1000000-0000-4000-8000-000000000003',
  'v1',
  true
);

-- ========================================================================
-- FIN DEL SCRIPT DE ESQUEMA BASE
-- ========================================================================
-- Después de ejecutar este script, debes ejecutar:
-- npm run db:apply-v2
-- 
-- Ese comando insertará:
-- - 52 provincias con foreign keys a regions
-- - 26 familias profesionales
-- - 31 preguntas de la encuesta v9
-- - Opciones de respuesta con cascadas (provinces, families)
-- - 20 respuestas de demostración
-- ========================================================================
