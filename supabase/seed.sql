-- Seed bootstrap (regions + estudio). El cuestionario activo es v2:
--   1) Ejecutar migrations/20260807120000_catalogs_v2.sql (o apply-catalogs-v2.sql)
--   2) npm run db:apply-v2
-- Este archivo deja v1 para instalaciones nuevas; apply-v2 desactiva v1 y crea v2.

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

insert into public.studies (id, slug, title, summary, status) values (
  'b1000000-0000-4000-8000-000000000001',
  'docentes-fpe-2026',
  'Estudio sobre la situación de los docentes de Formación Profesional para el Empleo',
  'Observatorio de la Formación Profesional para el Empleo. Encuesta anónima dirigida a docentes que imparten FPE en España. Agosto 2026',
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

insert into public.questions (id, survey_version_id, code, type, label, help_text, position, is_required) values
  ('c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000004', 'demo_age', 'single',
   '¿Cuál es tu tramo de edad?', null, 1, true),
  ('c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000004', 'demo_gender', 'single',
   '¿Con qué género te identificas?', null, 2, true),
  ('c1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000004', 'demo_ccaa', 'single',
   '¿En qué comunidad autónoma impartes principalmente FPE?', null, 3, true),
  ('c1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000004', 'demo_city', 'text',
   '¿En qué ciudad o municipio impartes principalmente?',
   'Indica la localidad principal. No se publicarán datos que permitan identificarte.', 4, true),
  ('c1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000004', 'demo_experience', 'single',
   '¿Cuántos años llevas impartiendo Formación Profesional para el Empleo?', null, 5, true),
  ('c1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000004', 'job_status', 'single',
   '¿Cuál es tu situación laboral principal como docente de FPE?', null, 6, true),
  ('c1000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000004', 'teaching_mode', 'single',
   '¿En qué modalidad impartes principalmente?', null, 7, true),
  ('c1000000-0000-4000-8000-000000000008', 'b1000000-0000-4000-8000-000000000004', 'hours_week', 'single',
   '¿Cuántas horas semanales de docencia FPE impartes habitualmente?', null, 8, true),
  ('c1000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-000000000004', 'income_stability', 'likert',
   '¿En qué medida consideras estable tu situación económica como docente de FPE?',
   '1 = Nada estable · 5 = Muy estable', 9, true),
  ('c1000000-0000-4000-8000-000000000010', 'b1000000-0000-4000-8000-000000000004', 'job_satisfaction', 'likert',
   'En general, ¿cuál es tu grado de satisfacción con tu trabajo como docente de FPE?',
   '1 = Nada satisfecho/a · 5 = Muy satisfecho/a', 10, true),
  ('c1000000-0000-4000-8000-000000000011', 'b1000000-0000-4000-8000-000000000004', 'main_challenge', 'single',
   '¿Cuál es el principal reto al que te enfrentas actualmente?', null, 11, true),
  ('c1000000-0000-4000-8000-000000000012', 'b1000000-0000-4000-8000-000000000004', 'would_recommend', 'single',
   '¿Recomendarías la docencia en FPE como carrera profesional?', null, 12, true);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000001', 'age_18_29', '18–29 años', 1),
  ('c1000000-0000-4000-8000-000000000001', 'age_30_39', '30–39 años', 2),
  ('c1000000-0000-4000-8000-000000000001', 'age_40_49', '40–49 años', 3),
  ('c1000000-0000-4000-8000-000000000001', 'age_50_59', '50–59 años', 4),
  ('c1000000-0000-4000-8000-000000000001', 'age_60_plus', '60 años o más', 5),
  ('c1000000-0000-4000-8000-000000000001', 'age_na', 'Prefiero no decirlo', 6);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000002', 'gender_woman', 'Mujer', 1),
  ('c1000000-0000-4000-8000-000000000002', 'gender_man', 'Hombre', 2),
  ('c1000000-0000-4000-8000-000000000002', 'gender_nonbinary', 'No binario', 3),
  ('c1000000-0000-4000-8000-000000000002', 'gender_other', 'Otro', 4),
  ('c1000000-0000-4000-8000-000000000002', 'gender_na', 'Prefiero no decirlo', 5);

insert into public.question_options (question_id, code, label, position, region_id) values
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_01', 'Andalucía', 1, 'a1000000-0000-4000-8000-000000000001'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_02', 'Aragón', 2, 'a1000000-0000-4000-8000-000000000002'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_03', 'Asturias', 3, 'a1000000-0000-4000-8000-000000000003'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_04', 'Illes Balears', 4, 'a1000000-0000-4000-8000-000000000004'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_05', 'Canarias', 5, 'a1000000-0000-4000-8000-000000000005'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_06', 'Cantabria', 6, 'a1000000-0000-4000-8000-000000000006'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_07', 'Castilla y León', 7, 'a1000000-0000-4000-8000-000000000007'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_08', 'Castilla-La Mancha', 8, 'a1000000-0000-4000-8000-000000000008'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_09', 'Cataluña', 9, 'a1000000-0000-4000-8000-000000000009'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_10', 'Comunitat Valenciana', 10, 'a1000000-0000-4000-8000-000000000010'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_11', 'Extremadura', 11, 'a1000000-0000-4000-8000-000000000011'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_12', 'Galicia', 12, 'a1000000-0000-4000-8000-000000000012'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_13', 'Comunidad de Madrid', 13, 'a1000000-0000-4000-8000-000000000013'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_14', 'Región de Murcia', 14, 'a1000000-0000-4000-8000-000000000014'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_15', 'Navarra', 15, 'a1000000-0000-4000-8000-000000000015'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_16', 'País Vasco', 16, 'a1000000-0000-4000-8000-000000000016'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_17', 'La Rioja', 17, 'a1000000-0000-4000-8000-000000000017'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_18', 'Ceuta', 18, 'a1000000-0000-4000-8000-000000000018'),
  ('c1000000-0000-4000-8000-000000000003', 'ccaa_19', 'Melilla', 19, 'a1000000-0000-4000-8000-000000000019');

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000005', 'exp_lt1', 'Menos de 1 año', 1),
  ('c1000000-0000-4000-8000-000000000005', 'exp_1_3', '1–3 años', 2),
  ('c1000000-0000-4000-8000-000000000005', 'exp_4_7', '4–7 años', 3),
  ('c1000000-0000-4000-8000-000000000005', 'exp_8_15', '8–15 años', 4),
  ('c1000000-0000-4000-8000-000000000005', 'exp_gt15', 'Más de 15 años', 5);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000006', 'job_employee', 'Cuenta ajena (contrato)', 1),
  ('c1000000-0000-4000-8000-000000000006', 'job_self', 'Autónomo/a', 2),
  ('c1000000-0000-4000-8000-000000000006', 'job_mixed', 'Mixto (cuenta ajena y autónomo)', 3),
  ('c1000000-0000-4000-8000-000000000006', 'job_other', 'Otra situación', 4);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000007', 'mode_presencial', 'Presencial', 1),
  ('c1000000-0000-4000-8000-000000000007', 'mode_teleformacion', 'Teleformación', 2),
  ('c1000000-0000-4000-8000-000000000007', 'mode_online', 'Online / virtual', 3),
  ('c1000000-0000-4000-8000-000000000007', 'mode_mixed', 'Mixta', 4);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000008', 'hours_lt10', 'Menos de 10 h', 1),
  ('c1000000-0000-4000-8000-000000000008', 'hours_10_20', '10–20 h', 2),
  ('c1000000-0000-4000-8000-000000000008', 'hours_21_30', '21–30 h', 3),
  ('c1000000-0000-4000-8000-000000000008', 'hours_31_40', '31–40 h', 4),
  ('c1000000-0000-4000-8000-000000000008', 'hours_gt40', 'Más de 40 h', 5);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000009', 'likert_1', '1', 1),
  ('c1000000-0000-4000-8000-000000000009', 'likert_2', '2', 2),
  ('c1000000-0000-4000-8000-000000000009', 'likert_3', '3', 3),
  ('c1000000-0000-4000-8000-000000000009', 'likert_4', '4', 4),
  ('c1000000-0000-4000-8000-000000000009', 'likert_5', '5', 5),
  ('c1000000-0000-4000-8000-000000000010', 'likert_1', '1', 1),
  ('c1000000-0000-4000-8000-000000000010', 'likert_2', '2', 2),
  ('c1000000-0000-4000-8000-000000000010', 'likert_3', '3', 3),
  ('c1000000-0000-4000-8000-000000000010', 'likert_4', '4', 4),
  ('c1000000-0000-4000-8000-000000000010', 'likert_5', '5', 5);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000011', 'challenge_instability', 'Inestabilidad / discontinuidad de encargos', 1),
  ('c1000000-0000-4000-8000-000000000011', 'challenge_pay', 'Remuneración insuficiente', 2),
  ('c1000000-0000-4000-8000-000000000011', 'challenge_admin', 'Carga administrativa', 3),
  ('c1000000-0000-4000-8000-000000000011', 'challenge_materials', 'Falta de materiales o recursos', 4),
  ('c1000000-0000-4000-8000-000000000011', 'challenge_recognition', 'Falta de reconocimiento profesional', 5),
  ('c1000000-0000-4000-8000-000000000011', 'challenge_other', 'Otro', 6);

insert into public.question_options (question_id, code, label, position) values
  ('c1000000-0000-4000-8000-000000000012', 'rec_yes', 'Sí', 1),
  ('c1000000-0000-4000-8000-000000000012', 'rec_maybe', 'Depende', 2),
  ('c1000000-0000-4000-8000-000000000012', 'rec_no', 'No', 3);
