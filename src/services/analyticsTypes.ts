import type { RespondentType } from "@/lib/respondent";

export const POPULATION_IDS = [
  "ALL_RESPONDENTS",
  "CURRENT_TEACHERS",
  "FORMER_TEACHERS",
  "TEACHING_EXPERIENCE",
  "ASPIRING_TEACHERS",
] as const;
export type PopulationId = (typeof POPULATION_IDS)[number];

export const DIMENSION_IDS = [
  "respondent_type",
  "demo_ccaa",
  "demo_family",
  "teaching_mode",
  "job_relation",
  "demo_experience",
  "job_entity_type",
  "job_fpe_share",
  "job_income_share",
  "demo_sector_experience",
  "demo_education",
  "aspiring_family",
  "aspiring_teaching_qualification",
  "aspiring_sector_experience",
  "aspiring_job_search",
] as const;
export type DimensionId = (typeof DIMENSION_IDS)[number];

export type SampleStatus = "hidden" | "very_low" | "caution" | "normal";
export type MetricPriority = "essential" | "very_relevant" | "exploratory";
export type MetricAggregation = "single" | "multi" | "likert" | "number" | "text";

export interface MetricDenominator {
  nTotal: number;
  nPopulation: number;
  nEligible: number;
  nAnswered: number;
  nValid: number;
}

export interface MetricOptionResult {
  code: string;
  label: string;
  count: number;
  percentage: number;
  rank?: number;
}

export interface BaseMetricResult {
  metricId: MetricId;
  questionCode: string;
  label: string;
  population: PopulationId;
  denominator: MetricDenominator;
  sampleStatus: SampleStatus;
}

export interface SingleMetricResult extends BaseMetricResult {
  aggregation: "single";
  options: MetricOptionResult[];
}

export interface MultiMetricResult extends BaseMetricResult {
  aggregation: "multi";
  options: MetricOptionResult[];
  multipleSelection: true;
}

export interface LikertMetricResult extends BaseMetricResult {
  aggregation: "likert";
  options: MetricOptionResult[];
  favorablePercentage?: number;
  neutralPercentage?: number;
  unfavorablePercentage?: number;
}

export interface NumericMetricResult extends BaseMetricResult {
  aggregation: "number";
  mean: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
}

export interface TextMetricResult extends BaseMetricResult {
  aggregation: "text";
}

export type MetricResult =
  | SingleMetricResult
  | MultiMetricResult
  | LikertMetricResult
  | NumericMetricResult
  | TextMetricResult;

export interface GroupedMetricResult {
  metricId: MetricId;
  dimension: DimensionId;
  groups: Record<string, MetricResult>;
}

export interface AnalyticsFilters {
  respondent_type?: RespondentType;
  demo_ccaa?: string;
  demo_family?: string;
  teaching_mode?: string;
  job_relation?: string;
  demo_experience?: string;
  job_entity_type?: string;
  job_fpe_share?: string;
  job_income_share?: string;
  demo_sector_experience?: string;
  demo_education?: string;
  aspiring_family?: string;
  aspiring_teaching_qualification?: string;
  aspiring_sector_experience?: string;
  aspiring_job_search?: string;
}

export interface MetricDefinition {
  id: MetricId;
  questionCode: string;
  population: PopulationId;
  aggregation: MetricAggregation;
  excludedOptionCodes?: readonly string[];
  allowedDimensions: readonly DimensionId[];
  comparableByRespondentType?: boolean;
  priority: MetricPriority;
  favorableOptionCodes?: readonly string[];
  neutralOptionCodes?: readonly string[];
  unfavorableOptionCodes?: readonly string[];
  derivedOptionCodes?: Readonly<Record<string, readonly string[]>>;
}

export const METRIC_IDS = [
  "profile_composition", "age_distribution", "gender_distribution", "education_distribution",
  "fpe_experience_distribution", "territorial_distribution", "main_family_distribution",
  "teaching_mode_distribution", "employment_relation_distribution", "entity_type_distribution",
  "fpe_main_activity", "fpe_activity_share", "centres_per_year", "annual_income_distribution",
  "income_dependency", "unpaid_hours_distribution", "unpaid_tasks_ranking", "materials_burden",
  "months_worked_distribution", "course_notice_distribution", "course_search_distribution",
  "work_availability_perception", "student_recruitment_difficulty", "salary_adequacy_perception",
  "professional_recognition", "sector_problems_ranking", "future_expectation_distribution",
  "aspiring_family_interest", "aspiring_requirements_knowledge", "aspiring_teaching_qualification",
  "aspiring_sector_experience", "aspiring_job_search", "aspiring_access_barriers",
  "aspiring_preferred_mode", "aspiring_economic_perception", "aspiring_hourly_rate_distribution",
] as const;
export type MetricId = (typeof METRIC_IDS)[number];
