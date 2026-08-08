export function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
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
