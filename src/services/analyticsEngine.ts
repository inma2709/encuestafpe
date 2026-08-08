import { isQuestionApplicable } from "@/lib/respondent";
import type { SurveyQuestion } from "@/types";
import { ANALYTICS_METRICS } from "./analyticsCatalog";
import { belongsToPopulation } from "./analyticsPopulation";
import { getSampleStatus } from "./analyticsSample";
import type { AnswerRow, SurveyDataset } from "./analytics";
import type {
  AnalyticsFilters, DimensionId, GroupedMetricResult, MetricDefinition, MetricDenominator,
  MetricId, MetricOptionResult, MetricResult, NumericMetricResult, PopulationId,
} from "./analyticsTypes";

export interface MetricRequest {
  metric: MetricId;
  population?: PopulationId;
  filters?: AnalyticsFilters;
  groupBy?: DimensionId;
}

function uniqueIds(rows: AnswerRow[]): Set<string> {
  return new Set(rows.map((row) => row.session_id));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function questionFor(dataset: SurveyDataset, definition: MetricDefinition): SurveyQuestion {
  const question = dataset.questionByCode.get(definition.questionCode);
  if (!question) throw new Error(`Analytics question not found: ${definition.questionCode}`);
  return question;
}

export function sessionIdsForPopulation(
  dataset: SurveyDataset,
  population: PopulationId,
): string[] {
  return dataset.sessions
    .filter((session) => belongsToPopulation(session.respondent_type, population))
    .map((session) => session.id);
}

function optionIdFor(dataset: SurveyDataset, questionCode: string, optionCode: string): string | undefined {
  return dataset.optionIdByCode.get(questionCode)?.get(optionCode);
}

export function applyAnalyticsFilters(
  dataset: SurveyDataset,
  sourceIds: string[],
  filters: AnalyticsFilters = {},
): string[] {
  let ids = new Set(sourceIds);
  for (const [dimension, optionCode] of Object.entries(filters) as Array<[DimensionId, string | undefined]>) {
    if (!optionCode) continue;
    if (dimension === "respondent_type") {
      ids = new Set(dataset.sessions.filter((session) => ids.has(session.id) && session.respondent_type === optionCode).map((session) => session.id));
      continue;
    }
    const question = dataset.questionByCode.get(dimension);
    const optionId = optionIdFor(dataset, dimension, optionCode);
    if (!question || !optionId) {
      ids = new Set();
      continue;
    }
    const matching = new Set(dataset.answers
      .filter((answer) => answer.question_id === question.id && answer.option_id === optionId)
      .map((answer) => answer.session_id));
    ids = new Set([...ids].filter((id) => matching.has(id)));
  }
  return [...ids];
}

function denominator(
  dataset: SurveyDataset,
  question: SurveyQuestion,
  population: PopulationId,
  sessionIds: string[],
  rows: AnswerRow[],
  definition: MetricDefinition,
): MetricDenominator {
  const populationIds = new Set(sessionIdsForPopulation(dataset, population));
  const selected = new Set(sessionIds.filter((id) => populationIds.has(id)));
  const eligible = dataset.sessions.filter((session) =>
    selected.has(session.id) && session.respondent_type != null && isQuestionApplicable(question, session.respondent_type),
  ).map((session) => session.id);
  const eligibleSet = new Set(eligible);
  const answeredRows = rows.filter((row) => eligibleSet.has(row.session_id));
  const answeredIds = uniqueIds(answeredRows);
  const excluded = new Set(definition.excludedOptionCodes ?? []);
  const validRows = answeredRows.filter((row) => {
    if (!row.option_id && row.value_number != null) {
      return Number.isFinite(row.value_number)
        && (question.minValue == null || row.value_number >= question.minValue)
        && (question.maxValue == null || row.value_number <= question.maxValue);
    }
    if (!row.option_id) return (row.value_text?.trim().length ?? 0) > 0;
    const code = dataset.optionMeta.get(row.option_id)?.code;
    return !!code && !excluded.has(code);
  });
  return {
    nTotal: dataset.sessions.filter((session) => session.respondent_type != null).length,
    nPopulation: selected.size,
    nEligible: eligible.length,
    nAnswered: answeredIds.size,
    nValid: uniqueIds(validRows).size,
  };
}

function optionResults(
  dataset: SurveyDataset,
  question: SurveyQuestion,
  rows: AnswerRow[],
  denom: MetricDenominator,
  definition: MetricDefinition,
  rank: boolean,
): MetricOptionResult[] {
  const excluded = new Set(definition.excludedOptionCodes ?? []);
  const selectedIds = new Set(rows.map((row) => row.session_id));
  const base = question.options
    .filter((option) => !excluded.has(option.code))
    .map((option) => {
      const answerers = new Set(rows.filter((row) => row.option_id === option.id && selectedIds.has(row.session_id)).map((row) => row.session_id));
      const count = answerers.size;
      return { code: option.code, label: option.label, count, percentage: denom.nValid ? round((count / denom.nValid) * 100) : 0 };
    });
  if (!rank) return base;
  return base.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).map((option, index) => ({ ...option, rank: index + 1 }));
}

function percentile(sorted: number[], proportion: number): number | null {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * proportion;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function calculateMetric(
  dataset: SurveyDataset,
  definition: MetricDefinition,
  population: PopulationId,
  filters: AnalyticsFilters,
): MetricResult {
  const question = questionFor(dataset, definition);
  const applicableFilters = Object.fromEntries(
    Object.entries(filters).filter(([dimension]) => definition.allowedDimensions.includes(dimension as DimensionId)),
  ) as AnalyticsFilters;
  const ids = applyAnalyticsFilters(dataset, sessionIdsForPopulation(dataset, population), applicableFilters);
  const selected = new Set(ids);
  const rows = dataset.answers.filter((answer) => answer.question_id === question.id && selected.has(answer.session_id));
  const denom = denominator(dataset, question, population, ids, rows, definition);
  const base = {
    metricId: definition.id,
    questionCode: definition.questionCode,
    label: question.label,
    population,
    denominator: denom,
    sampleStatus: getSampleStatus(denom.nValid),
  } as const;
  if (definition.aggregation === "number") {
    const values = rows.map((row) => row.value_number).filter((value): value is number =>
      value != null && Number.isFinite(value) && (question.minValue == null || value >= question.minValue) && (question.maxValue == null || value <= question.maxValue),
    ).sort((a, b) => a - b);
    const mean = values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
    const numeric: NumericMetricResult = { ...base, aggregation: "number", mean, median: percentile(values, 0.5), p25: percentile(values, 0.25), p75: percentile(values, 0.75), min: values[0] ?? null, max: values.at(-1) ?? null };
    return numeric;
  }
  if (definition.aggregation === "text") return { ...base, aggregation: "text" };
  const options = optionResults(dataset, question, rows, denom, definition, definition.aggregation === "multi");
  if (definition.aggregation === "multi") return { ...base, aggregation: "multi", options, multipleSelection: true };
  if (definition.aggregation === "likert") {
    const sum = (codes: readonly string[] | undefined) => codes?.reduce((total, code) => total + (options.find((option) => option.code === code)?.percentage ?? 0), 0);
    return { ...base, aggregation: "likert", options, favorablePercentage: sum(definition.favorableOptionCodes), neutralPercentage: sum(definition.neutralOptionCodes), unfavorablePercentage: sum(definition.unfavorableOptionCodes) };
  }
  return { ...base, aggregation: "single", options };
}

export function getMetric(dataset: SurveyDataset, request: MetricRequest): MetricResult | GroupedMetricResult {
  const definition = ANALYTICS_METRICS[request.metric];
  const population = request.population ?? definition.population;
  if (request.groupBy) {
    if (!definition.allowedDimensions.includes(request.groupBy) && !(request.groupBy === "respondent_type" && definition.comparableByRespondentType)) {
      throw new Error(`Dimension ${request.groupBy} is not allowed for ${request.metric}`);
    }
    const groups = request.groupBy === "respondent_type"
      ? ["teacher", "former_teacher", "aspiring_teacher"]
      : dataset.questionByCode.get(request.groupBy)?.options.map((option) => option.code) ?? [];
    return { metricId: request.metric, dimension: request.groupBy, groups: Object.fromEntries(groups.map((optionCode) => [optionCode, calculateMetric(dataset, definition, population, { ...request.filters, [request.groupBy!]: optionCode })])) };
  }
  return calculateMetric(dataset, definition, population, request.filters ?? {});
}

export function getMetrics(dataset: SurveyDataset, metricIds: readonly MetricId[], filters: AnalyticsFilters = {}): Map<MetricId, MetricResult> {
  return new Map(metricIds.map((id) => [id, getMetric(dataset, { metric: id, filters })] as const).filter((entry): entry is readonly [MetricId, MetricResult] => !("groups" in entry[1])));
}
