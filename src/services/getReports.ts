import { MIN_REPORT_RESPONSES } from "@/lib/config";
import type { ReportFilters, ReportsView } from "@/types";
import { applyAnalyticsFilters, getMetric, getMetrics } from "./analyticsEngine";
import { filterOptionsFromDataset, loadSurveyDataset, parseReportFilters } from "./analytics";
import type { AnalyticsFilters, GroupedMetricResult, MetricId } from "./analyticsTypes";
import { buildInsightHeadlines, dashboardKpis } from "./reportNarrative";
import { aggregateReportQuestions, groupReportQuestions } from "./reportResults";

function analyticsFilters(filters: ReportFilters): AnalyticsFilters {
  return { demo_ccaa: filters.ccaaCode, demo_family: filters.familyCode, teaching_mode: filters.modeCode, job_relation: filters.relationCode, demo_experience: filters.experienceCode, job_entity_type: filters.entityTypeCode, job_fpe_share: filters.fpeShareCode };
}

function allReportFilters(filters: ReportFilters): AnalyticsFilters {
  return {
    ...analyticsFilters(filters),
    demo_province: filters.provinceCode,
    demo_sector_experience: filters.sectorExperienceCode,
  };
}

/** Curated metrics only feed headlines/KPIs; they never decide question visibility. */
const NARRATIVE_METRICS: MetricId[] = [
  "profile_composition", "age_distribution", "gender_distribution", "education_distribution", "fpe_experience_distribution", "territorial_distribution", "main_family_distribution",
  "teaching_mode_distribution", "employment_relation_distribution", "entity_type_distribution", "fpe_main_activity", "fpe_activity_share", "centres_per_year", "annual_income_distribution", "income_dependency", "unpaid_hours_distribution", "unpaid_tasks_ranking", "materials_burden", "months_worked_distribution", "course_notice_distribution", "course_search_distribution", "work_availability_perception", "student_recruitment_difficulty", "salary_adequacy_perception", "professional_recognition", "sector_problems_ranking", "future_expectation_distribution",
  "aspiring_family_interest", "aspiring_requirements_knowledge", "aspiring_teaching_qualification", "aspiring_sector_experience", "aspiring_job_search", "aspiring_access_barriers", "aspiring_preferred_mode", "aspiring_economic_perception", "aspiring_hourly_rate_distribution",
];

export async function getReports(studySlug: string, filters: ReportFilters = {}, _compare?: string): Promise<ReportsView> {
  const dataset = await loadSurveyDataset(studySlug);
  const metrics = getMetrics(dataset, NARRATIVE_METRICS, analyticsFilters(filters));
  const profileComparisons = (["sector_problems_ranking", "future_expectation_distribution"] as const)
    .map((metric) => getMetric(dataset, { metric, filters: analyticsFilters(filters), groupBy: "respondent_type" }))
    .filter((result): result is GroupedMetricResult => "groups" in result);
  const totalSessions = dataset.sessions.filter((session) => session.respondent_type != null).length;
  const filteredSessionIds = applyAnalyticsFilters(
    dataset,
    dataset.sessions.filter((session) => session.respondent_type != null).map((session) => session.id),
    allReportFilters(filters),
  );
  const questionAudit = aggregateReportQuestions(dataset, filteredSessionIds, MIN_REPORT_RESPONSES);
  const questionGroups = groupReportQuestions(questionAudit);
  const reports = questionGroups.map((group) => ({
    slug: group.id,
    title: group.title,
    question: group.intro,
    audience: "Personas a quienes correspondían las preguntas",
    kpis: [],
    executiveSummary: "Resultados con denominador específico por pregunta.",
    conclusions: [],
    sections: group.questions.map((question) => ({
      questionCode: question.code,
      title: question.label,
      totalAnswers: question.totalAnswers,
      validSessions: question.validSessions,
      suppressed: false,
      rows: question.buckets.map((bucket) => ({ ...bucket, suppressed: false })),
    })),
  }));
  return { studySlug: dataset.active.study.slug, studyTitle: dataset.active.study.title, waveLabel: dataset.active.wave.label, versionLabel: dataset.active.version.versionLabel, totalSessions, filteredSessions: filteredSessionIds.length, minN: MIN_REPORT_RESPONSES, filters, filterOptions: filterOptionsFromDataset(dataset), dashboardKpis: dashboardKpis(metrics), insightHeadlines: buildInsightHeadlines(metrics), segmentCompare: null, reports, indices: [], rankings: [], comparatives: [], headlines: [], temporal: [], metrics: [...metrics.values()], profileComparisons, questionGroups, questionAudit };
}

export { parseReportFilters };
