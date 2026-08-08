import { REPORTS_MIN_N } from "@/lib/config";
import type { AutoReport, QuestionResult, ReportFilters, ReportSection, ReportsView } from "@/types";
import { applyAnalyticsFilters, getMetric, getMetrics } from "./analyticsEngine";
import { filterOptionsFromDataset, loadSurveyDataset, parseReportFilters } from "./analytics";
import type { AnalyticsFilters, GroupedMetricResult, MetricId, MetricResult } from "./analyticsTypes";
import { buildInsightHeadlines, dashboardKpis, topMetricOption } from "./reportNarrative";

function analyticsFilters(filters: ReportFilters): AnalyticsFilters {
  return { demo_ccaa: filters.ccaaCode, demo_family: filters.familyCode, teaching_mode: filters.modeCode, job_relation: filters.relationCode, demo_experience: filters.experienceCode, job_entity_type: filters.entityTypeCode, job_fpe_share: filters.fpeShareCode };
}

function toQuestionResult(metric: MetricResult): QuestionResult {
  const options = "options" in metric ? metric.options : [];
  return { questionId: metric.questionCode, code: metric.questionCode, label: metric.label, type: metric.aggregation === "multi" ? "multi" : metric.aggregation === "likert" ? "likert" : "single", totalAnswers: metric.denominator.nAnswered, validSessions: metric.denominator.nEligible, suppressed: metric.sampleStatus === "hidden" || metric.sampleStatus === "very_low", buckets: options.map((option) => ({ optionId: option.code, ...option, display: `${option.percentage} % (n = ${option.count} de ${metric.denominator.nValid} respuestas válidas)` })) };
}

function section(metric: MetricResult | undefined): ReportSection | null {
  if (!metric) return null;
  const result = toQuestionResult(metric);
  return { questionCode: result.code, title: result.label, totalAnswers: result.totalAnswers, validSessions: result.validSessions, suppressed: result.suppressed, rows: result.suppressed ? [] : result.buckets.slice().sort((a, b) => b.count - a.count).map((bucket) => ({ code: bucket.code, label: bucket.label, count: bucket.count, percentage: bucket.percentage, suppressed: false, display: bucket.display })) };
}

function report(slug: string, title: string, question: string, audience: string, metricIds: MetricId[], metrics: Map<MetricId, MetricResult>): AutoReport {
  return { slug, title, question, audience, kpis: [], executiveSummary: `Corte analítico con denominadores específicos por pregunta.`, conclusions: [], sections: metricIds.map((id) => section(metrics.get(id))).filter((item): item is ReportSection => item != null) };
}

const REPORT_METRICS: MetricId[] = [
  "profile_composition", "age_distribution", "gender_distribution", "education_distribution", "fpe_experience_distribution", "territorial_distribution", "main_family_distribution",
  "teaching_mode_distribution", "employment_relation_distribution", "entity_type_distribution", "fpe_main_activity", "fpe_activity_share", "centres_per_year", "annual_income_distribution", "income_dependency", "unpaid_hours_distribution", "unpaid_tasks_ranking", "materials_burden", "months_worked_distribution", "course_notice_distribution", "course_search_distribution", "work_availability_perception", "student_recruitment_difficulty", "salary_adequacy_perception", "professional_recognition", "sector_problems_ranking", "future_expectation_distribution",
  "aspiring_family_interest", "aspiring_requirements_knowledge", "aspiring_teaching_qualification", "aspiring_sector_experience", "aspiring_job_search", "aspiring_access_barriers", "aspiring_preferred_mode", "aspiring_economic_perception", "aspiring_hourly_rate_distribution",
];

export async function getReports(studySlug: string, filters: ReportFilters = {}, _compare?: string): Promise<ReportsView> {
  const dataset = await loadSurveyDataset(studySlug);
  const metrics = getMetrics(dataset, REPORT_METRICS, analyticsFilters(filters));
  const profileComparisons = (["sector_problems_ranking", "future_expectation_distribution"] as const)
    .map((metric) => getMetric(dataset, { metric, filters: analyticsFilters(filters), groupBy: "respondent_type" }))
    .filter((result): result is GroupedMetricResult => "groups" in result);
  const reports = [
    report("mercado-laboral", "Estado del mercado laboral en FPE", "¿Cómo se trabaja actualmente en FPE?", "Docentes actuales", ["months_worked_distribution", "course_notice_distribution", "course_search_distribution", "centres_per_year", "employment_relation_distribution", "fpe_main_activity"], metrics),
    report("economia-docente", "Economía del docente FPE", "¿Qué muestran los ingresos y el trabajo no remunerado?", "Docentes actuales", ["annual_income_distribution", "income_dependency", "unpaid_hours_distribution", "unpaid_tasks_ranking", "materials_burden"], metrics),
    report("radiografia-colectivo", "Radiografía del colectivo docente", "¿Quiénes responden y cómo desarrollan su actividad?", "Docentes y exdocentes", ["profile_composition", "age_distribution", "education_distribution", "territorial_distribution", "main_family_distribution", "teaching_mode_distribution", "fpe_experience_distribution", "entity_type_distribution"], metrics),
  ];
  reports[0].kpis = dashboardKpis(metrics);
  reports[1].kpis = dashboardKpis(metrics).slice(3);
  const totalSessions = dataset.sessions.filter((session) => session.respondent_type != null).length;
  const filteredSessions = applyAnalyticsFilters(dataset, dataset.sessions.filter((session) => session.respondent_type != null).map((session) => session.id), analyticsFilters(filters)).length;
  return { studySlug: dataset.active.study.slug, studyTitle: dataset.active.study.title, waveLabel: dataset.active.wave.label, versionLabel: dataset.active.version.versionLabel, totalSessions, filteredSessions, minN: REPORTS_MIN_N, filters, filterOptions: filterOptionsFromDataset(dataset), dashboardKpis: dashboardKpis(metrics), insightHeadlines: buildInsightHeadlines(metrics), segmentCompare: null, reports, indices: [], rankings: [], comparatives: [], headlines: [], temporal: [], metrics: [...metrics.values()], profileComparisons };
}

export { parseReportFilters };
