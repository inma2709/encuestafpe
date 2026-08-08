-- Segment the active FPE questionnaire without changing historical sessions.
alter table public.questions
  add column if not exists audience text[] not null default array['all']::text[];

alter table public.questions
  drop constraint if exists questions_audience_check;
alter table public.questions
  add constraint questions_audience_check check (
    audience = array['all']::text[]
    or (cardinality(audience) > 0 and audience <@ array['teacher', 'former_teacher', 'aspiring_teacher']::text[])
  );

alter table public.response_sessions
  add column if not exists respondent_type text;

alter table public.response_sessions
  drop constraint if exists response_sessions_respondent_type_check;
alter table public.response_sessions
  add constraint response_sessions_respondent_type_check check (
    respondent_type is null
    or respondent_type in ('teacher', 'former_teacher', 'aspiring_teacher')
  );

-- Existing answers remain NULL: they predate profile classification.
update public.questions q
set audience = array['teacher', 'former_teacher']::text[]
from public.survey_versions v
join public.surveys s on s.id = v.survey_id
join public.studies st on st.id = s.study_id
where q.survey_version_id = v.id
  and v.is_active = true
  and st.slug = 'docentes-fpe-2026'
  and q.code <> 'respondent_type';

-- Position 0 deliberately places the profile before the current questionnaire.
insert into public.questions (survey_version_id, code, type, label, help_text, position, is_required, is_active, audience)
select v.id, 'respondent_type', 'single',
  '¿Cuál es actualmente tu relación con la Formación Profesional para el Empleo (FPE)?',
  null, 0, true, true, array['all']::text[]
from public.survey_versions v
join public.surveys s on s.id = v.survey_id
join public.studies st on st.id = s.study_id
where v.is_active = true and st.slug = 'docentes-fpe-2026'
on conflict (survey_version_id, code) do update
set label = excluded.label, position = excluded.position, is_required = true,
    is_active = true, audience = array['all']::text[];

insert into public.question_options (question_id, code, label, position, is_active)
select q.id, x.code, x.label, x.position, true
from public.questions q
join public.survey_versions v on v.id = q.survey_version_id
join public.surveys s on s.id = v.survey_id
join public.studies st on st.id = s.study_id
cross join (values
  ('teacher', 'Soy docente de FPE actualmente.', 1),
  ('former_teacher', 'He trabajado como docente de FPE, aunque actualmente no estoy impartiendo.', 2),
  ('aspiring_teacher', 'Estoy preparándome o intentando acceder a la docencia FPE.', 3)
) as x(code, label, position)
where q.code = 'respondent_type' and v.is_active = true and st.slug = 'docentes-fpe-2026'
on conflict (question_id, code) do update
set label = excluded.label, position = excluded.position, is_active = true;

insert into public.questions (survey_version_id, code, type, label, help_text, position, is_required, is_active, audience)
select v.id, x.code, x.type, x.label, x.help_text, x.position, true, true, array['aspiring_teacher']::text[]
from public.survey_versions v
join public.surveys s on s.id = v.survey_id
join public.studies st on st.id = s.study_id
cross join (values
  ('aspiring_family', 'select', '¿En qué familia profesional te gustaría impartir?', 'Selecciona la familia principal que te interesa.', 31),
  ('aspiring_requirements_knowledge', 'single', '¿Conoces los requisitos para ejercer como docente de FPE?', null, 32),
  ('aspiring_teaching_qualification', 'single', '¿Dispones de formación o habilitación docente?', null, 33),
  ('aspiring_sector_experience', 'single', '¿Tienes experiencia profesional relacionada con la materia que quieres impartir?', null, 34),
  ('aspiring_job_search', 'single', '¿Has buscado ya ofertas como docente de FPE?', null, 35),
  ('aspiring_main_difficulty', 'single', '¿Cuál es la principal dificultad que encuentras para acceder?', null, 36),
  ('aspiring_work_mode', 'single', '¿Qué modalidad de trabajo te interesaría más?', null, 37),
  ('aspiring_economic_conditions', 'likert', 'Considero que las condiciones económicas de la docencia FPE son atractivas', '1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo', 38),
  ('aspiring_hourly_rate', 'number', '¿Qué remuneración bruta por hora considerarías adecuada?', 'Indica una cifra aproximada en euros.', 39)
) as x(code, type, label, help_text, position)
where v.is_active = true and st.slug = 'docentes-fpe-2026'
on conflict (survey_version_id, code) do update
set type = excluded.type, label = excluded.label, help_text = excluded.help_text,
    position = excluded.position, is_required = true, is_active = true,
    audience = array['aspiring_teacher']::text[];

update public.questions
set min_value = 1, max_value = 200
where code = 'aspiring_hourly_rate';

insert into public.question_options (question_id, code, label, position, is_active)
select q.id, x.code, x.label, x.position, true
from public.questions q
join public.survey_versions v on v.id = q.survey_version_id
join public.surveys s on s.id = v.survey_id
join public.studies st on st.id = s.study_id
join lateral (
  select * from (values
    ('aspiring_requirements_knowledge', 'req_yes', 'Sí, los conozco bien', 1),
    ('aspiring_requirements_knowledge', 'req_somewhat', 'Los conozco parcialmente', 2),
    ('aspiring_requirements_knowledge', 'req_no', 'No, necesito informarme', 3),
    ('aspiring_teaching_qualification', 'qualification_yes', 'Sí', 1),
    ('aspiring_teaching_qualification', 'qualification_in_progress', 'La estoy cursando o preparando', 2),
    ('aspiring_teaching_qualification', 'qualification_no', 'No', 3),
    ('aspiring_sector_experience', 'sector_exp_yes', 'Sí', 1),
    ('aspiring_sector_experience', 'sector_exp_no', 'No', 2),
    ('aspiring_job_search', 'search_yes', 'Sí, activamente', 1),
    ('aspiring_job_search', 'search_somewhat', 'He mirado algunas ofertas', 2),
    ('aspiring_job_search', 'search_no', 'Todavía no', 3),
    ('aspiring_main_difficulty', 'difficulty_requirements', 'Entender los requisitos', 1),
    ('aspiring_main_difficulty', 'difficulty_qualification', 'Obtener la habilitación docente', 2),
    ('aspiring_main_difficulty', 'difficulty_experience', 'Acreditar experiencia profesional', 3),
    ('aspiring_main_difficulty', 'difficulty_offers', 'Encontrar ofertas u oportunidades', 4),
    ('aspiring_main_difficulty', 'difficulty_other', 'Otra dificultad', 5),
    ('aspiring_work_mode', 'mode_presencial', 'Presencial', 1),
    ('aspiring_work_mode', 'mode_teleformacion', 'Teleformación', 2),
    ('aspiring_work_mode', 'mode_mixed', 'Mixta', 3),
    ('aspiring_economic_conditions', 'likert_1', '1', 1),
    ('aspiring_economic_conditions', 'likert_2', '2', 2),
    ('aspiring_economic_conditions', 'likert_3', '3', 3),
    ('aspiring_economic_conditions', 'likert_4', '4', 4),
    ('aspiring_economic_conditions', 'likert_5', '5', 5)
  ) as values(question_code, code, label, position)
) x on x.question_code = q.code
where v.is_active = true and st.slug = 'docentes-fpe-2026'
on conflict (question_id, code) do update
set label = excluded.label, position = excluded.position, is_active = true;

insert into public.question_options (question_id, code, label, position, professional_family_id, is_active)
select q.id, 'fam_' || pf.code, pf.name, pf.position, pf.id, true
from public.questions q
join public.survey_versions v on v.id = q.survey_version_id
join public.surveys s on s.id = v.survey_id
join public.studies st on st.id = s.study_id
join public.professional_families pf on true
where q.code = 'aspiring_family' and v.is_active = true and st.slug = 'docentes-fpe-2026'
on conflict (question_id, code) do update
set label = excluded.label, position = excluded.position,
    professional_family_id = excluded.professional_family_id, is_active = true;
