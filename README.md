# Observatorio de la Formación Profesional para el Empleo

Aplicación Astro + Supabase para la encuesta anónima del observatorio.

## Arranque rápido

### 1. Variables de entorno

```bash
cp .env.example .env
```

Rellena en `.env` la URL y keys de tu proyecto Supabase, y un `SURVEY_UNLOCK_SECRET` largo y aleatorio.

### 2. Base de datos (proyecto nuevo)

En el SQL Editor de Supabase, en orden:

1. `supabase/migrations/20260807100000_init.sql`
2. `supabase/seed.sql` (regions + estudio bootstrap)
3. `supabase/apply-catalogs-v2.sql` (provincias, familias, tipo `select`)
4. `npm run db:apply-v2` — activa el instrumento de investigación **v3** (v1/v2 históricas) + 10 demos

### Informes

- `/informes` — informes públicos agregados (si n ≥ umbral)
- `/estudios/docentes-fpe-2026/informes` — misma serie tras completar la encuesta


### 3. App local

```bash
npm install
npm run dev
```

Encuesta: `/estudios/docentes-fpe-2026/participar`

## Arquitectura

- **Supabase** = única fuente de verdad del cuestionario (sin `src/data`)
- **`src/lib`** = infraestructura
- **`src/services`** = dominio (`getActiveSurvey`, `submitSurvey`, `getResults`)
- **`src/types`** = contratos de dominio
- Páginas Astro solo llaman a `services`
- Provincia en cascada según CCAA (`region_id` en opciones)

## Scripts

- `npm run db:apply-v2` — cuestionario v2 + semillas
- `npm run db:seed-demo` — 10 respuestas extra sobre la versión activa

## Vercel

Mismas variables de entorno; adapter `@astrojs/vercel` con `output: "server"`.
