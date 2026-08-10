# Auditoría de cobertura de informes

Instantánea de la versión activa `v9`, revisada el 10 de agosto de 2026. Los recuentos son respuestas válidas por pregunta y pueden crecer con nuevas participaciones. “Antes” indica si el código estaba configurado en el informe anterior; algunas preguntas configuradas seguían ocultas o se calculaban con una población incorrecta.

| Pregunta | Bloque | Tipo | Respuestas | Antes | Ahora | Motivo si no se muestra |
|---|---|---:|---:|---:|---:|---|
| `respondent_type` | Perfil profesional | single | 48 | Sí | Sí | — |
| `demo_gender` | Perfil profesional | single | 48 | Sí | Sí | — |
| `demo_age` | Perfil profesional | single | 48 | Sí | Sí | — |
| `demo_ccaa` | Perfil profesional | single | 48 | Sí | Sí | — |
| `demo_experience` | Perfil profesional | single | 41 | Sí | Sí | — |
| `demo_education` | Perfil profesional | single | 48 | Sí | Sí | — |
| `demo_families` | Perfil profesional | multi | 41 | No | Sí | — |
| `demo_family` | Perfil profesional | select | 48 | Sí | Sí | — |
| `demo_sector_experience` | Perfil profesional | single | 48 | Sí, con población incorrecta | Sí | — |
| `teaching_mode` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `job_is_main` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `job_relation` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `job_entity_type` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `job_fpe_share` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `job_income_share` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `job_centers_year` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `job_months_year` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `course_notice` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `course_search` | Actividad y organización docente | single | 41 | Sí | Sí | — |
| `unpaid_hours` | Condiciones laborales y económicas | single | 41 | Sí | Sí | — |
| `materials_how` | Condiciones laborales y económicas | single | 41 | Sí | Sí | — |
| `unpaid_tasks` | Condiciones laborales y económicas | multi | 41 | Sí | Sí | — |
| `income_annual_range` | Condiciones laborales y económicas | single | 41 | Sí | Sí | — |
| `sector_hard_to_find_work` | Percepción y futuro del sector | likert | 41 | Sí | Sí | — |
| `sector_salaries_adequate` | Percepción y futuro del sector | likert | 41 | Sí | Sí | — |
| `sector_recognition` | Percepción y futuro del sector | likert | 48 | Sí | Sí | — |
| `sector_problems` | Percepción y futuro del sector | multi | 48 | Sí | Sí | — |
| `sector_missing_problem` | Percepción y futuro del sector | single | 48 | No | Sí | — |
| `open_comment` | Percepción y futuro del sector | text | 5 | No | No | Texto libre: no se publican respuestas individuales. |
| `student_recruitment_difficulty` | Percepción y futuro del sector | single | 41 | Sí | Sí | — |
| `future_3y` | Percepción y futuro del sector | single | 41 | Sí | Sí | — |
| `fpe_main_motivation` | Motivaciones y representación profesional | single | 48 | No | Sí | — |
| `professional_representation_membership` | Motivaciones y representación profesional | single | 41 | No | Sí | — |
| `collective_representation` | Motivaciones y representación profesional | single | 41 | No | Sí | — |
| `former_teacher_main_reason` | Trayectoria de exdocentes | single | 15 | No | Sí | — |
| `aspiring_current_situation` | Acceso a la docencia FPE | single | 7 | No | Sí | — |
| `aspiring_requirements_knowledge` | Acceso a la docencia FPE | single | 7 | Sí | Sí | — |
| `aspiring_teaching_qualification` | Acceso a la docencia FPE | single | 7 | Sí | Sí | — |
| `aspiring_job_search` | Acceso a la docencia FPE | single | 7 | Sí | Sí | — |
| `aspiring_search_time` | Acceso a la docencia FPE | single | 7 | No | Sí | — |
| `aspiring_main_difficulty` | Acceso a la docencia FPE | single | 7 | Sí | Sí | — |
| `aspiring_work_mode` | Acceso a la docencia FPE | single | 7 | Sí | Sí | — |
| `aspiring_economic_conditions` | Acceso a la docencia FPE | likert | 7 | Sí | Sí | — |
| `adequate_hourly_rate` | Acceso a la docencia FPE | number | 48 | Sí, con población incorrecta | Sí | — |

## Resumen de cobertura

- Preguntas activas: 44.
- Preguntas cerradas o numéricas: 43.
- Preguntas configuradas antes: 35 códigos distintos; las 35 alcanzan actualmente el umbral.
- Preguntas cerradas mostrables ahora con al menos 5 respuestas: 43.
- Preguntas mostradas ahora: 43.
- Preguntas cerradas no mostradas por privacidad: 0.
- Preguntas abiertas no publicadas: 1.

La auditoría se puede repetir contra los datos activos con `npm run audit:reports`.
