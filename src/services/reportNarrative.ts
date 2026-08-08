import type { KpiCard, QuestionResult, ResultBucket } from "@/types";

export function topBucket(q: QuestionResult | undefined) {
  if (!q || q.suppressed || !q.buckets.length) return null;
  return [...q.buckets].sort((a, b) => b.count - a.count)[0] ?? null;
}

export function pctOfCodes(
  q: QuestionResult | undefined,
  codes: string[],
): { pct: number; n: number; denom: number } | null {
  if (!q || q.suppressed || q.validSessions === 0) return null;
  const set = new Set(codes);
  const n = q.buckets.filter((b) => set.has(b.code)).reduce((s, b) => s + b.count, 0);
  const pct = Math.round((n / q.validSessions) * 1000) / 10;
  return { pct, n, denom: q.validSessions };
}

/** Likert 4+5 = de acuerdo / totalmente de acuerdo */
export function pctAgreeLikert(q: QuestionResult | undefined) {
  return pctOfCodes(q, ["likert_4", "likert_5"]);
}

export function interpretDistribution(q: QuestionResult | undefined): string | null {
  const top = topBucket(q);
  if (!q || !top || q.suppressed) return null;

  const map: Record<string, (t: ResultBucket, q: QuestionResult) => string> = {
    job_months_year: (t) =>
      `En esta muestra, el tramo más habitual es «${t.label}» (${t.percentage}%, n=${t.count}). Esto apunta a ${
        t.code === "months_10_12"
          ? "una dedicación relativamente continua a lo largo del año"
          : t.code === "months_1_3" || t.code === "months_4_6"
            ? "una elevada estacionalidad y la necesidad frecuente de complementar ingresos"
            : "una dedicación parcial con huecos relevantes en el calendario"
      }.`,
    course_notice: (t) =>
      `La antelación más frecuente es «${t.label}» (${t.percentage}%, n=${t.count}). ${
        t.code === "notice_same_week" || t.code === "notice_1_4w"
          ? "Una parte importante del colectivo opera con poca previsibilidad sobre la carga futura."
          : t.code === "notice_gt3m"
            ? "Hay un segmento con planificación relativamente estable."
            : "La previsibilidad es heterogénea entre docentes."
      }`,
    job_centers_year: (t) =>
      `El número de centros más citado es «${t.label}» (${t.percentage}%, n=${t.count}). ${
        t.code === "centers_1"
          ? "Una parte trabaja de forma más concentrada en un único centro."
          : "Trabajar en varios centros es habitual y fragmenta la actividad."
      }`,
    job_relation: (t) =>
      `La relación laboral predominante es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    income_annual_fpe: (t) =>
      `El tramo de ingresos FPE más frecuente es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    unpaid_hours: (t) =>
      `Respecto a horas no remuneradas, destaca «${t.label}» (${t.percentage}%, n=${t.count}). ${
        t.code === "unpaid_0"
          ? "Una minoría o parte del colectivo declara poca carga extra no pagada."
          : "La carga fuera del aula no remunerada es un rasgo estructural para muchos docentes."
      }`,
    materials_how: (t) =>
      `En materiales, la respuesta más frecuente es «${t.label}» (${t.percentage}%, n=${t.count}). ${
        t.code === "mat_self_unpaid"
          ? "Preparar materiales sin remuneración específica sigue siendo habitual."
          : "Hay variedad en quién asume y si se paga la preparación."
      }`,
    demo_age: (t) => `El tramo de edad más representado es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    demo_gender: (t) => `En género, la opción más frecuente es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    demo_ccaa: (t) =>
      `La comunidad con más respuestas en este corte es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    demo_family: (t) =>
      `La familia profesional principal más citada es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    teaching_mode: (t) =>
      `La modalidad predominante es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    demo_experience: (t) =>
      `La antigüedad en FPE más habitual es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    job_entity_type: (t) =>
      `El tipo de entidad más frecuente es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    demo_sector_experience: (t) =>
      `La experiencia profesional en la materia (fuera de la docencia) más citada es «${t.label}» (${t.percentage}%, n=${t.count}).`,
    job_is_main: (t) =>
      `Respecto a si la FPE es la actividad principal: «${t.label}» (${t.percentage}%, n=${t.count}).`,
  };

  const fn = map[q.code];
  if (fn) return fn(top, q);
  return `La opción más frecuente es «${top.label}» (${top.percentage}%, n=${top.count} sobre ${q.validSessions}).`;
}

export function buildInsightHeadlines(
  byCode: Map<string, QuestionResult>,
  filteredN: number,
  minN: number,
): Array<{ id: string; text: string; diffPp: number; n: number }> {
  if (filteredN < minN) return [];
  const out: Array<{ id: string; text: string; diffPp: number; n: number }> = [];

  const main = pctOfCodes(byCode.get("job_is_main"), ["main_yes"]);
  if (main && main.pct >= 40) {
    out.push({
      id: "h-main",
      text: `${Math.round(main.pct)}% considera la FPE su actividad profesional principal.`,
      diffPp: main.pct,
      n: main.denom,
    });
  }

  const centersMulti = pctOfCodes(byCode.get("job_centers_year"), [
    "centers_2",
    "centers_3",
    "centers_4_5",
    "centers_gt5",
  ]);
  if (centersMulti && centersMulti.pct >= 40) {
    const x = Math.round(centersMulti.pct / 10);
    out.push({
      id: "h-centers",
      text: `${x} de cada 10 docentes ha impartido en más de un centro en el último año.`,
      diffPp: centersMulti.pct,
      n: centersMulti.denom,
    });
  }

  const income = topBucket(byCode.get("income_annual_fpe"));
  if (income && income.code !== "inc_na") {
    out.push({
      id: "h-income",
      text: `El tramo salarial FPE más frecuente es ${income.label} (${income.percentage}%, n=${income.count}).`,
      diffPp: income.percentage,
      n: income.count,
    });
  }

  const shortNotice = pctOfCodes(byCode.get("course_notice"), [
    "notice_same_week",
    "notice_1_4w",
  ]);
  if (shortNotice && shortNotice.pct >= 35) {
    out.push({
      id: "h-notice",
      text: `Más del ${Math.round(shortNotice.pct)}% conoce normalmente un curso con menos de un mes de antelación.`,
      diffPp: shortNotice.pct,
      n: shortNotice.denom,
    });
  }

  const hard = pctAgreeLikert(byCode.get("sector_hard_to_find_work"));
  if (hard && hard.pct >= 40) {
    out.push({
      id: "h-hard",
      text: `${Math.round(hard.pct)}% considera difícil encontrar trabajo en FPE.`,
      diffPp: hard.pct,
      n: hard.denom,
    });
  }

  const unpaid = pctOfCodes(byCode.get("unpaid_hours"), [
    "unpaid_4_6",
    "unpaid_7_10",
    "unpaid_gt10",
  ]);
  if (unpaid && unpaid.pct >= 35) {
    out.push({
      id: "h-unpaid",
      text: `${Math.round(unpaid.pct)}% dedica 4 o más horas semanales no remuneradas fuera del aula.`,
      diffPp: unpaid.pct,
      n: unpaid.denom,
    });
  }

  const self = pctOfCodes(byCode.get("job_relation"), ["rel_self"]);
  if (self && self.pct >= 25) {
    out.push({
      id: "h-self",
      text: `${Math.round(self.pct)}% trabaja principalmente como autónomo/a en FPE.`,
      diffPp: self.pct,
      n: self.denom,
    });
  }

  return out.slice(0, 5);
}

export function kpi(
  id: string,
  value: string,
  label: string,
  suppressed: boolean,
  hint?: string,
): KpiCard {
  return { id, value, label, hint, suppressed };
}

export function dashboardKpis(
  byCode: Map<string, QuestionResult>,
  filteredN: number,
  minN: number,
): KpiCard[] {
  const low = filteredN < minN;
  const main = pctOfCodes(byCode.get("job_is_main"), ["main_yes"]);
  const months = topBucket(byCode.get("job_months_year"));
  const self = pctOfCodes(byCode.get("job_relation"), ["rel_self"]);
  const income = topBucket(byCode.get("income_annual_fpe"));
  const hard = pctAgreeLikert(byCode.get("sector_hard_to_find_work"));
  const unpaid = topBucket(byCode.get("unpaid_hours"));

  return [
    kpi(
      "main",
      low || !main ? "—" : `${Math.round(main.pct)}%`,
      "considera la FPE su actividad principal",
      low || !main,
    ),
    kpi(
      "months",
      low || !months ? "—" : months.label.replace(" meses", "").replace("meses", ""),
      "tramo más frecuente de meses al año",
      low || !months,
      months ? `${months.percentage}% · n=${months.count}` : undefined,
    ),
    kpi(
      "self",
      low || !self ? "—" : `${Math.round(self.pct)}%`,
      "autónomos/as",
      low || !self,
    ),
    kpi(
      "income",
      low || !income || income.code === "inc_na" ? "—" : income.label,
      "tramo salarial FPE más frecuente",
      low || !income || income.code === "inc_na",
      income && income.code !== "inc_na" ? `${income.percentage}%` : undefined,
    ),
    kpi(
      "hard",
      low || !hard ? "—" : `${Math.round(hard.pct)}%`,
      "considera difícil encontrar trabajo en FPE",
      low || !hard,
    ),
    kpi(
      "unpaid",
      low || !unpaid ? "—" : unpaid.label,
      "horas no remuneradas más habituales",
      low || !unpaid,
      unpaid ? `${unpaid.percentage}%` : undefined,
    ),
  ];
}
