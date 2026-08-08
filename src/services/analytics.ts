import { HEADLINE_DIFF_PP, REPORTS_MIN_N } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  DomainError,
  type ActiveSurvey,
  type ComparativeRow,
  type CompositeIndex,
  type HeadlineCard,
  type QuestionResult,
  type ReportFilters,
  type ReportRanking,
  type TemporalPoint,
} from "@/types";
import { getActiveSurvey } from "./getActiveSurvey";

export type AnswerRow = {
  question_id: string;
  option_id: string | null;
  value_text: string | null;
  session_id: string;
};

export type SessionRow = {
  id: string;
  completed_at: string;
};

export interface SurveyDataset {
  active: ActiveSurvey;
  sessions: SessionRow[];
  answers: AnswerRow[];
  /** questionCode -> optionCode -> optionId */
  optionIdByCode: Map<string, Map<string, string>>;
  /** optionId -> { code, label, questionCode } */
  optionMeta: Map<string, { code: string; label: string; questionCode: string }>;
  questionByCode: Map<string, ActiveSurvey["questions"][number]>;
}

export function formatPct(count: number, validSessions: number): {
  percentage: number;
  display: string;
} {
  const percentage =
    validSessions === 0 ? 0 : Math.round((count / validSessions) * 1000) / 10;
  return {
    percentage,
    display: `${percentage} % (n = ${count} de ${validSessions} respuestas válidas)`,
  };
}

export function parseReportFilters(
  params: URLSearchParams | Record<string, string | undefined>,
): ReportFilters {
  const get = (k: string) => {
    if (params instanceof URLSearchParams) return params.get(k) || undefined;
    return params[k] || undefined;
  };
  return {
    ccaaCode: get("ccaa") || undefined,
    provinceCode: get("provincia") || undefined,
    familyCode: get("familia") || undefined,
    modeCode: get("modalidad") || undefined,
    relationCode: get("relacion") || undefined,
    experienceCode: get("experiencia") || undefined,
    sectorExperienceCode: get("experiencia-sector") || undefined,
    entityTypeCode: get("entidad") || undefined,
    fpeShareCode: get("actividad") || undefined,
    workSourceCode: get("fuente") || undefined,
  };
}

export async function loadSurveyDataset(studySlug: string): Promise<SurveyDataset> {
  const active = await getActiveSurvey(studySlug);
  const admin = getSupabaseAdmin();

  const { data: sessions, error: sessionsError } = await admin
    .from("response_sessions")
    .select("id, completed_at")
    .eq("wave_id", active.wave.id)
    .eq("survey_version_id", active.version.id);

  if (sessionsError) throw new DomainError(sessionsError.message, "INTERNAL");

  const sessionList = sessions ?? [];
  let answers: AnswerRow[] = [];
  if (sessionList.length > 0) {
    const { data, error } = await admin
      .from("answers")
      .select("question_id, option_id, value_text, session_id")
      .in(
        "session_id",
        sessionList.map((s) => s.id),
      );
    if (error) throw new DomainError(error.message, "INTERNAL");
    answers = data ?? [];
  }

  const optionIdByCode = new Map<string, Map<string, string>>();
  const optionMeta = new Map<
    string,
    { code: string; label: string; questionCode: string }
  >();
  const questionByCode = new Map(
    active.questions.map((q) => [q.code, q] as const),
  );

  for (const q of active.questions) {
    const m = new Map<string, string>();
    for (const o of q.options) {
      m.set(o.code, o.id);
      optionMeta.set(o.id, { code: o.code, label: o.label, questionCode: q.code });
    }
    optionIdByCode.set(q.code, m);
  }

  return {
    active,
    sessions: sessionList,
    answers,
    optionIdByCode,
    optionMeta,
    questionByCode,
  };
}

/** Sessions matching all active filters (AND). */
export function filterSessionIds(
  dataset: SurveyDataset,
  filters: ReportFilters,
): string[] {
  const { answers, questionByCode, optionIdByCode, sessions } = dataset;
  let ids = new Set(sessions.map((s) => s.id));

  const apply = (questionCode: string, optionCode: string | undefined) => {
    if (!optionCode) return;
    const q = questionByCode.get(questionCode);
    const optId = optionIdByCode.get(questionCode)?.get(optionCode);
    if (!q || !optId) return;
    const matching = new Set(
      answers
        .filter((a) => a.question_id === q.id && a.option_id === optId)
        .map((a) => a.session_id),
    );
    ids = new Set([...ids].filter((id) => matching.has(id)));
  };

  apply("demo_ccaa", filters.ccaaCode);
  apply("demo_province", filters.provinceCode);
  apply("demo_family", filters.familyCode);
  apply("teaching_mode", filters.modeCode);
  apply("job_relation", filters.relationCode);
  apply("demo_experience", filters.experienceCode);
  apply("demo_sector_experience", filters.sectorExperienceCode);
  apply("job_entity_type", filters.entityTypeCode);
  apply("job_fpe_share", filters.fpeShareCode);
  apply("job_work_source", filters.workSourceCode);

  return [...ids];
}

export function buildQuestionResults(
  dataset: SurveyDataset,
  sessionIds: string[],
  minN: number,
): QuestionResult[] {
  const sessionSet = new Set(sessionIds);
  const validSessions = sessionIds.length;
  const rows = dataset.answers.filter((a) => sessionSet.has(a.session_id));

  return dataset.active.questions.map((question) => {
    const qRows = rows.filter((r) => r.question_id === question.id);

    if (question.type === "text") {
      const n = new Set(qRows.map((r) => r.session_id)).size;
      return {
        questionId: question.id,
        code: question.code,
        label: question.label,
        type: question.type,
        totalAnswers: n,
        validSessions,
        suppressed: n < minN,
        buckets: [],
        textResponseCount: n < minN ? undefined : n,
      };
    }

    const isMulti = question.type === "multi";
    const counts = new Map<string, number>();
    const sessionsPerOpt = new Map<string, Set<string>>();

    for (const row of qRows) {
      if (!row.option_id) continue;
      if (isMulti) {
        if (!sessionsPerOpt.has(row.option_id)) {
          sessionsPerOpt.set(row.option_id, new Set());
        }
        sessionsPerOpt.get(row.option_id)!.add(row.session_id);
      } else {
        counts.set(row.option_id, (counts.get(row.option_id) ?? 0) + 1);
      }
    }

    if (isMulti) {
      for (const [optId, set] of sessionsPerOpt) {
        counts.set(optId, set.size);
      }
    }

    // Denominador: sesiones del filtro (penetración), no suma de opciones
    const denom = validSessions;
    const responding = new Set(qRows.map((r) => r.session_id)).size;
    const suppressed = responding < minN;

    const buckets = suppressed
      ? []
      : question.options.map((opt) => {
          const count = counts.get(opt.id) ?? 0;
          const { percentage, display } = formatPct(count, denom);
          return {
            optionId: opt.id,
            code: opt.code,
            label: opt.label,
            count,
            percentage,
            display,
          };
        });

    return {
      questionId: question.id,
      code: question.code,
      label: question.label,
      type: question.type,
      totalAnswers: responding,
      validSessions: denom,
      suppressed,
      buckets,
    };
  });
}

/** Ordinal scores 0–100 for precarity components */
const PRECARITY_SCORES: Record<string, Record<string, number>> = {
  job_months_year: {
    months_1_3: 100,
    months_4_6: 70,
    months_7_9: 35,
    months_10_12: 10,
  },
  unpaid_hours: {
    unpaid_0: 0,
    unpaid_1_3: 25,
    unpaid_4_6: 50,
    unpaid_7_10: 75,
    unpaid_gt10: 100,
  },
  course_notice: {
    notice_same_week: 100,
    notice_1_4w: 70,
    notice_1_3m: 35,
    notice_gt3m: 10,
    notice_unknown: 60,
  },
  // legacy if present
  course_gap: {
    gap_lt1w: 20,
    gap_1_4w: 40,
    gap_1_3m: 70,
    gap_gt3m: 90,
    gap_none: 100,
  },
  job_centers_year: {
    centers_1: 10,
    centers_2: 35,
    centers_3: 55,
    centers_4_5: 75,
    centers_gt5: 100,
  },
  course_search: {
    search_none_contacted: 15,
    search_lt1h: 35,
    search_1_3h: 55,
    search_4_7h: 80,
    search_gt7h: 100,
  },
  materials_how: {
    mat_company: 15,
    mat_self_paid: 25,
    mat_shared: 40,
    mat_self_unpaid: 90,
  },
  job_fpe_share: {
    fpe_all: 70,
    fpe_gt75: 55,
    fpe_50_75: 40,
    fpe_lt50: 25,
    fpe_occasional: 15,
  },
};

function sessionOptionCode(
  dataset: SurveyDataset,
  sessionId: string,
  questionCode: string,
): string | null {
  const q = dataset.questionByCode.get(questionCode);
  if (!q) return null;
  const row = dataset.answers.find(
    (a) => a.session_id === sessionId && a.question_id === q.id && a.option_id,
  );
  if (!row?.option_id) return null;
  return dataset.optionMeta.get(row.option_id)?.code ?? null;
}

function sessionPrecarity(dataset: SurveyDataset, sessionId: string): number | null {
  const parts: number[] = [];
  for (const [qCode, map] of Object.entries(PRECARITY_SCORES)) {
    if (!dataset.questionByCode.has(qCode)) continue;
    const code = sessionOptionCode(dataset, sessionId, qCode);
    if (code && map[code] != null) parts.push(map[code]);
  }
  if (parts.length < 3) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function sessionSatisfaction(
  dataset: SurveyDataset,
  sessionId: string,
): number | null {
  const likert = (code: string, invert: boolean) => {
    const c = sessionOptionCode(dataset, sessionId, code);
    if (!c || !c.startsWith("likert_")) return null;
    const v = Number(c.replace("likert_", ""));
    if (!Number.isFinite(v)) return null;
    const score = ((v - 1) / 4) * 100;
    return invert ? 100 - score : score;
  };
  const parts = [
    likert("sector_recognition", false),
    likert("sector_salaries_adequate", false),
    likert("sector_too_many_teachers", true),
    likert("sector_hard_to_find_work", true),
  ].filter((x): x is number => x != null);
  if (parts.length < 3) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function bandPrecarity(score: number): string {
  if (score < 20) return "Muy baja";
  if (score < 40) return "Baja";
  if (score < 60) return "Media";
  if (score < 80) return "Alta";
  return "Muy alta";
}

export function bandSatisfaction(score: number): string {
  if (score < 20) return "Muy baja";
  if (score < 40) return "Baja";
  if (score < 60) return "Media";
  if (score < 80) return "Alta";
  return "Muy alta";
}

export function computeIndices(
  dataset: SurveyDataset,
  sessionIds: string[],
  minN: number,
): CompositeIndex[] {
  const prec: number[] = [];
  const sat: number[] = [];
  for (const id of sessionIds) {
    const p = sessionPrecarity(dataset, id);
    const s = sessionSatisfaction(dataset, id);
    if (p != null) prec.push(p);
    if (s != null) sat.push(s);
  }
  const mean = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const pMean = mean(prec);
  const sMean = mean(sat);

  return [
    {
      id: "precarity",
      name: "Índice de precariedad docente",
      mean: pMean,
      band: pMean != null ? bandPrecarity(pMean) : null,
      n: prec.length,
      suppressed: prec.length < minN,
      description:
        "Indicador 0–100 a partir de meses trabajados, horas no remuneradas, antelación de encargos, nº de entidades/centros, esfuerzo de búsqueda de cursos y dependencia económica de la FPE.",
    },
    {
      id: "satisfaction",
      name: "Índice de clima del sector",
      mean: sMean,
      band: sMean != null ? bandSatisfaction(sMean) : null,
      n: sat.length,
      suppressed: sat.length < minN,
      description:
        "Indicador 0–100 a partir de las Likert de reconocimiento, salarios, exceso de docentes y dificultad para encontrar trabajo.",
    },
  ];
}

function pctWithCode(
  dataset: SurveyDataset,
  sessionIds: string[],
  questionCode: string,
  optionCode: string,
): { pct: number; n: number; groupN: number } {
  const q = dataset.questionByCode.get(questionCode);
  const optId = dataset.optionIdByCode.get(questionCode)?.get(optionCode);
  if (!q || !optId) return { pct: 0, n: 0, groupN: sessionIds.length };
  const set = new Set(sessionIds);
  const n = dataset.answers.filter(
    (a) =>
      set.has(a.session_id) &&
      a.question_id === q.id &&
      a.option_id === optId,
  ).length;
  // for single-choice, one answer per session
  const groupN = sessionIds.length;
  const pct = groupN === 0 ? 0 : Math.round((n / groupN) * 1000) / 10;
  return { pct, n, groupN };
}

function sessionsWithOption(
  dataset: SurveyDataset,
  sessionIds: string[],
  questionCode: string,
  optionCode: string,
): string[] {
  const q = dataset.questionByCode.get(questionCode);
  const optId = dataset.optionIdByCode.get(questionCode)?.get(optionCode);
  if (!q || !optId) return [];
  const set = new Set(sessionIds);
  return [
    ...new Set(
      dataset.answers
        .filter(
          (a) =>
            set.has(a.session_id) &&
            a.question_id === q.id &&
            a.option_id === optId,
        )
        .map((a) => a.session_id),
    ),
  ];
}

export {
  pctWithCode as pctWithCodeExport,
  sessionsWithOption as sessionsWithOptionExport,
};

export function computeComparatives(
  dataset: SurveyDataset,
  sessionIds: string[],
  minN: number,
): ComparativeRow[] {
  const rows: ComparativeRow[] = [];

  const pushPctDiff = (
    groupQ: string,
    codeA: string,
    labelA: string,
    codeB: string,
    labelB: string,
    metricQ: string,
    metricCode: string,
    metricLabel: string,
  ) => {
    const aIds = sessionsWithOption(dataset, sessionIds, groupQ, codeA);
    const bIds = sessionsWithOption(dataset, sessionIds, groupQ, codeB);
    const a = pctWithCode(dataset, aIds, metricQ, metricCode);
    const b = pctWithCode(dataset, bIds, metricQ, metricCode);
    const suppressed = a.groupN < minN || b.groupN < minN;
    const diffPp = Math.round((a.pct - b.pct) * 10) / 10;
    rows.push({
      groupA: labelA,
      groupB: labelB,
      metric: metricLabel,
      valueA: a.pct,
      valueB: b.pct,
      diffPp,
      nA: a.groupN,
      nB: b.groupN,
      suppressed,
      statement: suppressed
        ? `Comparativa ${labelA} vs ${labelB} no publicable (n insuficiente).`
        : `${labelA}: ${a.pct}% en «${metricLabel}» frente a ${b.pct}% en ${labelB} (Δ ${diffPp > 0 ? "+" : ""}${diffPp} pp; n=${a.groupN} vs ${b.groupN}).`,
    });
  };

  pushPctDiff(
    "job_relation",
    "rel_self",
    "Autónomos",
    "rel_employee",
    "Contratados",
    "unpaid_hours",
    "unpaid_gt10",
    "más de 10 h no remuneradas/semana",
  );
  pushPctDiff(
    "teaching_mode",
    "mode_teleformacion",
    "Teleformación",
    "mode_presencial",
    "Presencial",
    "unpaid_hours",
    "unpaid_gt10",
    "más de 10 h no remuneradas/semana",
  );
  pushPctDiff(
    "demo_gender",
    "gender_woman",
    "Mujeres",
    "gender_man",
    "Hombres",
    "job_relation",
    "rel_self",
    "trabajo como autónomo/a",
  );
  pushPctDiff(
    "demo_experience",
    "exp_gt15",
    "Más de 15 años",
    "exp_1_3",
    "1–3 años",
    "job_months_year",
    "months_10_12",
    "trabajan 10–12 meses/año",
  );
  pushPctDiff(
    "demo_sector_experience",
    "sect_none",
    "Sin experiencia profesional en la materia",
    "sect_gt10",
    "Más de 10 años en la materia",
    "income_annual_fpe",
    "inc_lt6",
    "ingresos FPE < 6.000 €",
  );
  pushPctDiff(
    "job_fpe_share",
    "fpe_all",
    "Actividad docente 100% FPE",
    "fpe_occasional",
    "FPE solo ocasional",
    "income_annual_fpe",
    "inc_lt6",
    "ingresos FPE < 6.000 €",
  );

  return rows;
}

export function computeTerritorialRankings(
  dataset: SurveyDataset,
  sessionIds: string[],
  minN: number,
): ReportRanking[] {
  const ccaaQ = dataset.questionByCode.get("demo_ccaa");
  if (!ccaaQ) return [];

  const byCcaa = new Map<string, string[]>();
  for (const opt of ccaaQ.options) {
    byCcaa.set(opt.code, sessionsWithOption(dataset, sessionIds, "demo_ccaa", opt.code));
  }

  const label = (code: string) =>
    ccaaQ.options.find((o) => o.code === code)?.label ?? code;

  const ranking = (
    id: string,
    title: string,
    scoreFn: (ids: string[]) => { value: number; valueLabel: string } | null,
  ): ReportRanking => {
    const rows = [...byCcaa.entries()]
      .map(([code, ids]) => {
        const suppressed = ids.length < minN;
        const scored = suppressed ? null : scoreFn(ids);
        return {
          code,
          label: label(code),
          value: scored?.value ?? 0,
          valueLabel: scored?.valueLabel ?? "—",
          n: ids.length,
          suppressed,
        };
      })
      .filter((r) => !r.suppressed)
      .sort((a, b) => b.value - a.value);
    return { id, title, rows };
  };

  return [
    ranking("autonomos", "Comunidades con mayor % de autónomos", (ids) => {
      const { pct } = pctWithCode(dataset, ids, "job_relation", "rel_self");
      return { value: pct, valueLabel: `${pct} % autónomos` };
    }),
    ranking("estabilidad", "Comunidades con mayor estabilidad (10–12 meses)", (ids) => {
      const { pct } = pctWithCode(dataset, ids, "job_months_year", "months_10_12");
      return { value: pct, valueLabel: `${pct} % con 10–12 meses` };
    }),
    ranking("ingresos", "Comunidades con mayor % en tramo >25.000 € FPE", (ids) => {
      const a = pctWithCode(dataset, ids, "income_annual_fpe", "inc_25_35");
      const b = pctWithCode(dataset, ids, "income_annual_fpe", "inc_gt35");
      const pct = Math.round((a.pct + b.pct) * 10) / 10;
      return { value: pct, valueLabel: `${pct} % en tramos altos` };
    }),
    ranking("precarity", "Comunidades con mayor índice medio de precariedad", (ids) => {
      const scores = ids
        .map((id) => sessionPrecarity(dataset, id))
        .filter((x): x is number => x != null);
      if (!scores.length) return null;
      const mean = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return { value: mean, valueLabel: `${mean}/100` };
    }),
  ];
}

export function computeHeadlines(
  comparatives: ComparativeRow[],
  rankings: ReportRanking[],
  minN: number,
): HeadlineCard[] {
  const cards: HeadlineCard[] = [];
  let i = 0;

  for (const c of comparatives) {
    if (c.suppressed) continue;
    if (Math.abs(c.diffPp) < HEADLINE_DIFF_PP) continue;
    cards.push({
      id: `cmp-${i++}`,
      text: c.statement,
      diffPp: Math.abs(c.diffPp),
      n: c.nA + c.nB,
    });
  }

  for (const r of rankings) {
    if (r.rows.length < 2) continue;
    const top = r.rows[0];
    const bottom = r.rows[r.rows.length - 1];
    if (top.suppressed || bottom.suppressed) continue;
    const diff = Math.abs(top.value - bottom.value);
    if (diff < HEADLINE_DIFF_PP) continue;
    cards.push({
      id: `rank-${r.id}`,
      text: `${r.title}: ${top.label} (${top.valueLabel}, n=${top.n}) frente a ${bottom.label} (${bottom.valueLabel}, n=${bottom.n}).`,
      diffPp: diff,
      n: top.n + bottom.n,
    });
  }

  return cards
    .filter((c) => c.n >= minN)
    .sort((a, b) => b.diffPp - a.diffPp)
    .slice(0, 8);
}

export function computeTemporal(
  dataset: SurveyDataset,
  sessionIds: string[],
): TemporalPoint[] {
  const set = new Set(sessionIds);
  const byPeriod = new Map<string, string[]>();

  for (const s of dataset.sessions) {
    if (!set.has(s.id)) continue;
    const d = new Date(s.completed_at);
    if (Number.isNaN(d.getTime())) continue;
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byPeriod.has(period)) byPeriod.set(period, []);
    byPeriod.get(period)!.push(s.id);
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, ids]) => {
      const prec = ids
        .map((id) => sessionPrecarity(dataset, id))
        .filter((x): x is number => x != null);
      const sat = ids
        .map((id) => sessionSatisfaction(dataset, id))
        .filter((x): x is number => x != null);
      return {
        period,
        n: ids.length,
        precarityMean: prec.length
          ? Math.round(prec.reduce((a, b) => a + b, 0) / prec.length)
          : null,
        satisfactionMean: sat.length
          ? Math.round(sat.reduce((a, b) => a + b, 0) / sat.length)
          : null,
      };
    });
}

export function filterOptionsFromDataset(dataset: SurveyDataset) {
  const opts = (code: string) => {
    const q = dataset.questionByCode.get(code);
    return (q?.options ?? []).map((o) => ({ code: o.code, label: o.label }));
  };
  const provinces = (dataset.questionByCode.get("demo_province")?.options ?? []).map(
    (o) => ({
      code: o.code,
      label: o.label,
      regionCode: o.regionId
        ? dataset.active.questions
            .find((q) => q.code === "demo_ccaa")
            ?.options.find((r) => r.regionId === o.regionId)?.code
        : undefined,
    }),
  );
  return {
    ccaa: opts("demo_ccaa"),
    provinces,
    families: opts("demo_family"),
    modes: opts("teaching_mode"),
    relations: opts("job_relation"),
    experiences: opts("demo_experience"),
    sectorExperiences: opts("demo_sector_experience"),
    entityTypes: opts("job_entity_type"),
    fpeShares: opts("job_fpe_share"),
    workSources: opts("job_work_source"),
  };
}

export { REPORTS_MIN_N };
