export type QuestionType =
  | "single"
  | "multi"
  | "likert"
  | "text"
  | "number"
  | "select";

export type StudyStatus = "draft" | "open" | "closed" | "archived";

export interface Region {
  id: string;
  ineCode: string;
  name: string;
  slug: string;
}

export interface SurveyOption {
  id: string;
  code: string;
  label: string;
  position: number;
  regionId: string | null;
  provinceId: string | null;
  professionalFamilyId: string | null;
}

export interface SurveyQuestion {
  id: string;
  code: string;
  type: QuestionType;
  /** How the UI should render; select for long lists / cascaded province */
  display: "radio" | "checkbox" | "select" | "text" | "number" | "likert";
  label: string;
  helpText: string | null;
  position: number;
  required: boolean;
  minValue: number | null;
  maxValue: number | null;
  options: SurveyOption[];
}

export interface ActiveSurvey {
  study: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    status: StudyStatus;
  };
  wave: {
    id: string;
    label: string;
    opensAt: string | null;
    closesAt: string | null;
  };
  survey: {
    id: string;
    title: string;
  };
  version: {
    id: string;
    versionLabel: string;
  };
  questions: SurveyQuestion[];
}

export type AnswerInput =
  | { questionId: string; optionId: string }
  | { questionId: string; optionIds: string[] }
  | { questionId: string; valueText: string }
  | { questionId: string; valueNumber: number };

export interface SubmitSurveyInput {
  studySlug: string;
  answers: AnswerInput[];
  durationMs?: number;
  /** Honeypot: must be empty */
  website?: string;
}

export interface SubmitSurveyResult {
  ok: true;
  unlockToken: string;
  studySlug: string;
}

export interface ResultBucket {
  optionId: string;
  code: string;
  label: string;
  count: number;
  percentage: number;
  /** Texto listo para UI: "54% (n = 12 de 40 respuestas válidas)" */
  display: string;
}

export interface QuestionResult {
  questionId: string;
  code: string;
  label: string;
  type: QuestionType;
  totalAnswers: number;
  /** Denominador del informe (sesiones en el filtro) */
  validSessions: number;
  suppressed: boolean;
  buckets: ResultBucket[];
  textResponseCount?: number;
}

export interface ResultsView {
  studySlug: string;
  studyTitle: string;
  waveLabel: string;
  totalSessions: number;
  minN: number;
  questions: QuestionResult[];
}

export interface ReportFilters {
  /** region option code e.g. ccaa_13 or region uuid — we use option code */
  ccaaCode?: string;
  provinceCode?: string;
  familyCode?: string;
  modeCode?: string;
  relationCode?: string;
  experienceCode?: string;
  sectorExperienceCode?: string;
  entityTypeCode?: string;
  fpeShareCode?: string;
  workSourceCode?: string;
}

export interface CompositeIndex {
  id: string;
  name: string;
  mean: number | null;
  band: string | null;
  n: number;
  suppressed: boolean;
  description: string;
}

export interface RankingRow {
  code: string;
  label: string;
  value: number;
  valueLabel: string;
  n: number;
  suppressed: boolean;
}

export interface ReportRanking {
  id: string;
  title: string;
  rows: RankingRow[];
}

export interface ComparativeRow {
  groupA: string;
  groupB: string;
  metric: string;
  valueA: number;
  valueB: number;
  diffPp: number;
  nA: number;
  nB: number;
  suppressed: boolean;
  statement: string;
}

export interface HeadlineCard {
  id: string;
  text: string;
  diffPp: number;
  n: number;
}

export interface TemporalPoint {
  period: string;
  n: number;
  precarityMean: number | null;
  satisfactionMean: number | null;
}

export interface ReportStatRow {
  code: string;
  label: string;
  count: number;
  percentage: number;
  suppressed: boolean;
  display: string;
}

export interface ReportSection {
  questionCode: string;
  title: string;
  totalAnswers: number;
  validSessions: number;
  suppressed: boolean;
  rows: ReportStatRow[];
  interpretation?: string | null;
}

export interface KpiCard {
  id: string;
  value: string;
  label: string;
  hint?: string;
  suppressed: boolean;
}

export interface AutoReport {
  slug: string;
  title: string;
  /** Pregunta que responde el informe */
  question: string;
  /** Público principal */
  audience: string;
  kpis: KpiCard[];
  executiveSummary: string;
  conclusions: string[];
  sections: ReportSection[];
}

export interface SegmentCompare {
  dimension: string;
  labelA: string;
  labelB: string;
  nA: number;
  nB: number;
  suppressed: boolean;
  metrics: Array<{
    id: string;
    label: string;
    valueA: string;
    valueB: string;
  }>;
}

export interface ReportsView {
  studySlug: string;
  studyTitle: string;
  waveLabel: string;
  versionLabel: string;
  totalSessions: number;
  /** Sesiones tras aplicar filtros */
  filteredSessions: number;
  minN: number;
  filters: ReportFilters;
  filterOptions: {
    ccaa: Array<{ code: string; label: string }>;
    provinces: Array<{ code: string; label: string; regionCode?: string }>;
    families: Array<{ code: string; label: string }>;
    modes: Array<{ code: string; label: string }>;
    relations: Array<{ code: string; label: string }>;
    experiences: Array<{ code: string; label: string }>;
    sectorExperiences: Array<{ code: string; label: string }>;
    entityTypes: Array<{ code: string; label: string }>;
    fpeShares: Array<{ code: string; label: string }>;
    workSources: Array<{ code: string; label: string }>;
  };
  dashboardKpis: KpiCard[];
  insightHeadlines: HeadlineCard[];
  segmentCompare: SegmentCompare | null;
  reports: AutoReport[];
  indices: CompositeIndex[];
  rankings: ReportRanking[];
  comparatives: ComparativeRow[];
  headlines: HeadlineCard[];
  temporal: TemporalPoint[];
}

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "CLOSED"
      | "VALIDATION"
      | "FORBIDDEN"
      | "CONFIG"
      | "INTERNAL",
  ) {
    super(message);
    this.name = "DomainError";
  }
}
