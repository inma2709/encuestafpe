const ENV = {
  PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  SURVEY_UNLOCK_SECRET: import.meta.env.SURVEY_UNLOCK_SECRET,
} as const;

export function requireEnv(name: keyof typeof ENV): string {
  const value = ENV[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const SITE_NAME = "Observatorio de la Formación Profesional para el Empleo";

/** Minimum responses before a result cell is shown (detalle) */
export const RESULTS_MIN_N = 5;

/** Umbral para publicar celdas / rankings en informes */
export const REPORTS_MIN_N = 15;

/** Diferencia relativa mínima para destacar un titular automático */
export const HEADLINE_DIFF_PP = 20;

export const UNLOCK_COOKIE = "fpe_unlock";
export const UNLOCK_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
