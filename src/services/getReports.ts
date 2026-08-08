import { REPORTS_MIN_N } from "@/lib/config";
import {
  type AutoReport,
  type KpiCard,
  type QuestionResult,
  type ReportFilters,
  type ReportSection,
  type ReportsView,
  type SegmentCompare,
} from "@/types";
import {
  buildQuestionResults,
  computeComparatives,
  computeHeadlines,
  computeIndices,
  computeTemporal,
  computeTerritorialRankings,
  filterOptionsFromDataset,
  filterSessionIds,
  loadSurveyDataset,
  parseReportFilters,
  sessionsWithOptionExport,
  pctWithCodeExport,
} from "./analytics";
import {
  buildInsightHeadlines,
  dashboardKpis,
  interpretDistribution,
  kpi,
  pctAgreeLikert,
  pctOfCodes,
  topBucket,
} from "./reportNarrative";

function sectionFromQuestion(q: QuestionResult | undefined): ReportSection | null {
  if (!q) return null;
  return {
    questionCode: q.code,
    title: q.label,
    totalAnswers: q.totalAnswers,
    validSessions: q.validSessions,
    suppressed: q.suppressed,
    interpretation: interpretDistribution(q),
    rows: q.suppressed
      ? []
      : q.buckets
          .slice()
          .sort((a, b) => b.count - a.count)
          .map((b) => ({
            code: b.code,
            label: b.label,
            count: b.count,
            percentage: b.percentage,
            suppressed: false,
            display: b.display,
          })),
  };
}

function reportKpisMercado(byCode: Map<string, QuestionResult>, low: boolean): KpiCard[] {
  const main = pctOfCodes(byCode.get("job_is_main"), ["main_yes"]);
  const months = topBucket(byCode.get("job_months_year"));
  const self = pctOfCodes(byCode.get("job_relation"), ["rel_self"]);
  const income = topBucket(byCode.get("income_annual_fpe"));
  return [
    kpi("m-main", low || !main ? "—" : `${Math.round(main.pct)}%`, "considera la FPE su actividad principal", low || !main),
    kpi("m-months", low || !months ? "—" : months.label, "media de trabajo (tramo más frecuente)", low || !months, months ? `${months.percentage}%` : undefined),
    kpi("m-self", low || !self ? "—" : `${Math.round(self.pct)}%`, "autónomos/as", low || !self),
    kpi(
      "m-income",
      low || !income || income.code === "inc_na" ? "—" : income.label,
      "tramo salarial más frecuente",
      low || !income || income.code === "inc_na",
    ),
  ];
}

function reportKpisEconomia(byCode: Map<string, QuestionResult>, low: boolean): KpiCard[] {
  const income = topBucket(byCode.get("income_annual_fpe"));
  const unpaid = topBucket(byCode.get("unpaid_hours"));
  const mat = pctOfCodes(byCode.get("materials_how"), ["mat_self_unpaid"]);
  const self = pctOfCodes(byCode.get("job_relation"), ["rel_self"]);
  return [
    kpi(
      "e-inc",
      low || !income || income.code === "inc_na" ? "—" : income.label,
      "ingresos FPE más frecuentes",
      low || !income || income.code === "inc_na",
    ),
    kpi("e-unpaid", low || !unpaid ? "—" : unpaid.label, "horas no remuneradas más habituales", low || !unpaid),
    kpi("e-mat", low || !mat ? "—" : `${Math.round(mat.pct)}%`, "prepara materiales sin remuneración", low || !mat),
    kpi("e-self", low || !self ? "—" : `${Math.round(self.pct)}%`, "autónomos/as", low || !self),
  ];
}

function reportKpisPerfil(byCode: Map<string, QuestionResult>, low: boolean): KpiCard[] {
  const age = topBucket(byCode.get("demo_age"));
  const mode = topBucket(byCode.get("teaching_mode"));
  const fam = topBucket(byCode.get("demo_family"));
  const exp = topBucket(byCode.get("demo_experience"));
  return [
    kpi("p-age", low || !age ? "—" : age.label, "tramo de edad más frecuente", low || !age),
    kpi("p-mode", low || !mode ? "—" : mode.label, "modalidad predominante", low || !mode),
    kpi("p-fam", low || !fam ? "—" : fam.label, "familia profesional principal", low || !fam),
    kpi("p-exp", low || !exp ? "—" : exp.label, "antigüedad en FPE más habitual", low || !exp),
  ];
}

function buildConclusionsMercado(byCode: Map<string, QuestionResult>): string[] {
  const months = topBucket(byCode.get("job_months_year"));
  const notice = topBucket(byCode.get("course_notice"));
  const centers = topBucket(byCode.get("job_centers_year"));
  const lines: string[] = [];
  if (months && notice) {
    lines.push(
      `La mayoría se concentra en «${months.label}» de trabajo al año y conoce los cursos con antelación «${notice.label}», lo que refleja un mercado con elevada incertidumbre.`,
    );
  }
  if (centers && centers.code !== "centers_1") {
    lines.push(
      `Impartir en varios centros (${centers.label} como tramo más citado) fragmenta la actividad y aumenta la dependencia de múltiples encargos.`,
    );
  }
  const self = pctOfCodes(byCode.get("job_relation"), ["rel_self"]);
  if (self && self.pct >= 30) {
    lines.push(`Casi ${Math.round(self.pct)}% trabaja como autónomo/a: el riesgo económico recae con frecuencia en la persona docente.`);
  }
  if (!lines.length) lines.push("Aún no hay suficientes respuestas para concluir sobre el mercado laboral FPE.");
  return lines.slice(0, 3);
}

function buildConclusionsEconomia(byCode: Map<string, QuestionResult>): string[] {
  const unpaid = topBucket(byCode.get("unpaid_hours"));
  const mat = pctOfCodes(byCode.get("materials_how"), ["mat_self_unpaid"]);
  const lines: string[] = [];
  if (unpaid && unpaid.code !== "unpaid_0") {
    lines.push(
      `La preparación y coordinación siguen suponiendo una carga no remunerada relevante («${unpaid.label}» es el tramo más habitual).`,
    );
  }
  if (mat && mat.pct >= 25) {
    lines.push(`${Math.round(mat.pct)}% prepara los materiales sin remuneración específica.`);
  }
  const income = topBucket(byCode.get("income_annual_fpe"));
  if (income && income.code !== "inc_na") {
    lines.push(`El tramo de ingresos FPE más frecuente (${income.label}) debe leerse junto con el % de actividad docente en FPE.`);
  }
  if (!lines.length) lines.push("Datos insuficientes para concluir sobre la economía del docente.");
  return lines.slice(0, 3);
}

function buildConclusionsPerfil(byCode: Map<string, QuestionResult>): string[] {
  const mode = topBucket(byCode.get("teaching_mode"));
  const fam = topBucket(byCode.get("demo_family"));
  const ccaa = topBucket(byCode.get("demo_ccaa"));
  const lines: string[] = [];
  if (mode) lines.push(`La modalidad más extendida es «${mode.label}».`);
  if (fam) lines.push(`Entre quienes responden, destaca la familia «${fam.label}» como principal.`);
  if (ccaa) lines.push(`La comunidad con más participación en este corte es «${ccaa.label}».`);
  if (!lines.length) lines.push("Datos insuficientes para radiografiar el colectivo.");
  return lines.slice(0, 3);
}

function buildSegmentCompare(
  dataset: Awaited<ReturnType<typeof loadSurveyDataset>>,
  sessionIds: string[],
  minN: number,
  compare: string | undefined,
): SegmentCompare | null {
  if (compare !== "relacion" && compare !== "modalidad") return null;

  const isRelation = compare === "relacion";
  const qCode = isRelation ? "job_relation" : "teaching_mode";
  const codeA = isRelation ? "rel_self" : "mode_teleformacion";
  const codeB = isRelation ? "rel_employee" : "mode_presencial";
  const labelA = isRelation ? "Autónomos/as" : "Teleformación";
  const labelB = isRelation ? "Cuenta ajena" : "Presencial";

  const aIds = sessionsWithOptionExport(dataset, sessionIds, qCode, codeA);
  const bIds = sessionsWithOptionExport(dataset, sessionIds, qCode, codeB);
  const suppressed = aIds.length < minN || bIds.length < minN;

  const metric = (ids: string[], mq: string, mc: string) => {
    const r = pctWithCodeExport(dataset, ids, mq, mc);
    return `${r.pct}%`;
  };

  const topLabel = (ids: string[], mq: string) => {
    const results = buildQuestionResults(dataset, ids, 1);
    const q = results.find((x) => x.code === mq);
    const t = topBucket(q);
    return t ? t.label : "—";
  };

  return {
    dimension: compare,
    labelA,
    labelB,
    nA: aIds.length,
    nB: bIds.length,
    suppressed,
    metrics: suppressed
      ? []
      : [
          {
            id: "main",
            label: "FPE como actividad principal",
            valueA: metric(aIds, "job_is_main", "main_yes"),
            valueB: metric(bIds, "job_is_main", "main_yes"),
          },
          {
            id: "months",
            label: "Tramo de meses más frecuente",
            valueA: topLabel(aIds, "job_months_year"),
            valueB: topLabel(bIds, "job_months_year"),
          },
          {
            id: "unpaid",
            label: "≥4 h no remuneradas / semana",
            valueA: String(
              Math.round(
                (pctWithCodeExport(dataset, aIds, "unpaid_hours", "unpaid_4_6").pct +
                  pctWithCodeExport(dataset, aIds, "unpaid_hours", "unpaid_7_10").pct +
                  pctWithCodeExport(dataset, aIds, "unpaid_hours", "unpaid_gt10").pct) *
                  10,
              ) / 10,
            ) + "%",
            valueB: String(
              Math.round(
                (pctWithCodeExport(dataset, bIds, "unpaid_hours", "unpaid_4_6").pct +
                  pctWithCodeExport(dataset, bIds, "unpaid_hours", "unpaid_7_10").pct +
                  pctWithCodeExport(dataset, bIds, "unpaid_hours", "unpaid_gt10").pct) *
                  10,
              ) / 10,
            ) + "%",
          },
          {
            id: "income",
            label: "Tramo de ingresos más frecuente",
            valueA: topLabel(aIds, "income_annual_fpe"),
            valueB: topLabel(bIds, "income_annual_fpe"),
          },
        ],
  };
}

export async function getReports(
  studySlug: string,
  filters: ReportFilters = {},
  compare?: string,
): Promise<ReportsView> {
  const dataset = await loadSurveyDataset(studySlug);
  const allIds = dataset.sessions.map((s) => s.id);
  const filteredIds = filterSessionIds(dataset, filters);
  const questions = buildQuestionResults(dataset, filteredIds, REPORTS_MIN_N);
  const byCode = new Map(questions.map((q) => [q.code, q]));
  const low = filteredIds.length < REPORTS_MIN_N;

  const reports: AutoReport[] = [
    {
      slug: "mercado-laboral",
      title: "Estado del mercado laboral en FPE",
      question: "¿Cómo está realmente el mercado?",
      audience: "Docentes FPE",
      kpis: reportKpisMercado(byCode, low),
      executiveSummary: `Corte de ${filteredIds.length} respuestas. Continuidad temporal, centralidad de la actividad, relación laboral, fragmentación entre centros y antelación de encargos.`,
      conclusions: buildConclusionsMercado(byCode),
      sections: ["job_months_year", "course_notice", "job_centers_year", "job_relation", "job_is_main"]
        .map((c) => sectionFromQuestion(byCode.get(c)))
        .filter((s): s is ReportSection => s != null),
    },
    {
      slug: "economia-docente",
      title: "Economía del docente FPE",
      question: "¿Qué me voy a encontrar en lo económico?",
      audience: "Quienes entran o se plantean la FPE",
      kpis: reportKpisEconomia(byCode, low),
      executiveSummary: `Corte de ${filteredIds.length} respuestas. Ingresos FPE, trabajo no remunerado y remuneración de materiales.`,
      conclusions: buildConclusionsEconomia(byCode),
      sections: ["income_annual_fpe", "unpaid_hours", "materials_how", "job_fpe_share"]
        .map((c) => sectionFromQuestion(byCode.get(c)))
        .filter((s): s is ReportSection => s != null),
    },
    {
      slug: "radiografia-colectivo",
      title: "Radiografía del colectivo docente",
      question: "¿Cómo es el colectivo docente?",
      audience: "Empresas y consultoras",
      kpis: reportKpisPerfil(byCode, low),
      executiveSummary: `Corte de ${filteredIds.length} respuestas. Perfil demográfico, territorial, familiar, modalidad, experiencia y tipo de entidad.`,
      conclusions: buildConclusionsPerfil(byCode),
      sections: [
        "demo_age",
        "demo_gender",
        "demo_ccaa",
        "demo_family",
        "teaching_mode",
        "demo_experience",
        "job_entity_type",
      ]
        .map((c) => sectionFromQuestion(byCode.get(c)))
        .filter((s): s is ReportSection => s != null),
    },
  ];

  // Percepción del sector como indicadores (no gráficos Likert crudos)
  const hard = pctAgreeLikert(byCode.get("sector_hard_to_find_work"));
  const recog = pctAgreeLikert(byCode.get("sector_recognition"));
  if (hard || recog) {
    reports[0].kpis.push(
      kpi(
        "m-climate",
        low || !hard ? "—" : `${Math.round(hard.pct)}%`,
        "considera difícil encontrar trabajo en FPE",
        low || !hard,
      ),
    );
  }

  const indices = computeIndices(dataset, filteredIds, REPORTS_MIN_N);
  const rankings = computeTerritorialRankings(dataset, filteredIds, REPORTS_MIN_N);
  const comparatives = computeComparatives(dataset, filteredIds, REPORTS_MIN_N);
  const headlines = computeHeadlines(comparatives, rankings, REPORTS_MIN_N);
  const temporal = computeTemporal(dataset, filteredIds);
  const insightHeadlines = buildInsightHeadlines(byCode, filteredIds.length, REPORTS_MIN_N);
  const segmentCompare = buildSegmentCompare(dataset, filteredIds, REPORTS_MIN_N, compare);

  return {
    studySlug: dataset.active.study.slug,
    studyTitle: dataset.active.study.title,
    waveLabel: dataset.active.wave.label,
    versionLabel: dataset.active.version.versionLabel,
    totalSessions: allIds.length,
    filteredSessions: filteredIds.length,
    minN: REPORTS_MIN_N,
    filters,
    filterOptions: filterOptionsFromDataset(dataset),
    dashboardKpis: dashboardKpis(byCode, filteredIds.length, REPORTS_MIN_N),
    insightHeadlines,
    segmentCompare,
    reports,
    indices,
    rankings,
    comparatives,
    headlines,
    temporal,
  };
}

export { parseReportFilters };
