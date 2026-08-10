import type { QuestionResult, ReportQuestionAudit, ReportQuestionGroup } from "../types/index";
import type { SurveyDataset } from "./analytics";

export interface ReportBlockDefinition {
  id: string;
  title: string;
  intro: string;
  fromPosition: number;
  toPosition: number;
}

/** Blocks follow the active questionnaire order; questions are never whitelisted. */
export const REPORT_BLOCKS: readonly ReportBlockDefinition[] = [
  { id: "perfil", title: "Perfil profesional", intro: "Perfil, territorio, formación y experiencia de quienes participan.", fromPosition: 0, toPosition: 8 },
  { id: "actividad", title: "Actividad y organización docente", intro: "Modalidad, relación con las entidades, dedicación, continuidad y acceso a cursos.", fromPosition: 9, toPosition: 18 },
  { id: "condiciones", title: "Condiciones laborales y económicas", intro: "Trabajo no remunerado, materiales e ingresos declarados.", fromPosition: 19, toPosition: 22 },
  { id: "sector", title: "Percepción y futuro del sector", intro: "Valoraciones, problemas percibidos y expectativas profesionales.", fromPosition: 23, toPosition: 30 },
  { id: "representacion", title: "Motivaciones y representación profesional", intro: "Motivaciones para ejercer y percepción de la representación colectiva.", fromPosition: 31, toPosition: 33 },
  { id: "exdocentes", title: "Trayectoria de exdocentes", intro: "Experiencias declaradas por quienes ya no imparten FPE.", fromPosition: 34, toPosition: 34 },
  { id: "acceso", title: "Acceso a la docencia FPE", intro: "Situación, preparación, búsqueda y expectativas de quienes quieren acceder.", fromPosition: 35, toPosition: Number.POSITIVE_INFINITY },
] as const;

const LEGACY_REPORTED_QUESTION_CODES = new Set([
  "respondent_type", "demo_age", "demo_gender", "demo_education", "demo_experience", "demo_ccaa", "demo_family",
  "teaching_mode", "job_relation", "job_entity_type", "job_is_main", "job_fpe_share", "job_centers_year",
  "income_annual_range", "job_income_share", "unpaid_hours", "unpaid_tasks", "materials_how", "job_months_year",
  "course_notice", "course_search", "sector_hard_to_find_work", "student_recruitment_difficulty",
  "sector_salaries_adequate", "sector_recognition", "sector_problems", "future_3y", "aspiring_requirements_knowledge",
  "aspiring_teaching_qualification", "demo_sector_experience", "aspiring_job_search", "aspiring_main_difficulty",
  "aspiring_work_mode", "aspiring_economic_conditions", "adequate_hourly_rate",
]);

interface NumericRange {
  code: string;
  label: string;
  min?: number;
  max?: number;
}

const NUMERIC_REPORT_CONFIG: Readonly<Record<string, { unit: string; ranges: readonly NumericRange[] }>> = {
  adequate_hourly_rate: {
    unit: "€/hora",
    ranges: [
      { code: "under_15", label: "Menos de 15 €", max: 15 },
      { code: "15_under_20", label: "15–<20 €", min: 15, max: 20 },
      { code: "20_under_25", label: "20–<25 €", min: 20, max: 25 },
      { code: "25_under_30", label: "25–<30 €", min: 25, max: 30 },
      { code: "30_under_40", label: "30–<40 €", min: 30, max: 40 },
      { code: "40_under_50", label: "40–<50 €", min: 40, max: 50 },
      { code: "50_or_more", label: "50 € o más", min: 50 },
    ],
  },
};

function percentile(sorted: number[], proportion: number): number {
  const index = (sorted.length - 1) * proportion;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return Math.round((sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)) * 10) / 10;
}

function appliesTo(question: SurveyDataset["active"]["questions"][number], respondentType: string | null): boolean {
  return respondentType != null && (question.audience === "all" || question.audience.includes(respondentType as "teacher" | "former_teacher" | "aspiring_teacher"));
}

function blockFor(position: number): ReportBlockDefinition {
  return REPORT_BLOCKS.find((block) => position >= block.fromPosition && position <= block.toPosition)
    ?? { id: "otros", title: "Otros resultados", intro: "Otras preguntas cerradas del cuestionario activo.", fromPosition: position, toPosition: position };
}

export function aggregateReportQuestions(
  dataset: SurveyDataset,
  sessionIds: readonly string[],
  minResponses: number,
): ReportQuestionAudit[] {
  const selected = new Set(sessionIds);

  return dataset.active.questions.map((question) => {
    const block = blockFor(question.position);
    const eligibleIds = new Set(dataset.sessions
      .filter((session) => selected.has(session.id) && appliesTo(question, session.respondent_type))
      .map((session) => session.id));
    const rows = dataset.answers.filter((answer) => answer.question_id === question.id && eligibleIds.has(answer.session_id));
    const validOptionIds = new Set(question.options.map((option) => option.id));
    const validRows = rows.filter((row) => {
      if (question.type === "number") return row.value_number != null && Number.isFinite(row.value_number)
        && (question.minValue == null || row.value_number >= question.minValue)
        && (question.maxValue == null || row.value_number <= question.maxValue);
      if (question.type === "text") return (row.value_text?.trim().length ?? 0) > 0;
      return row.option_id != null && validOptionIds.has(row.option_id);
    });
    const answerers = new Set(validRows.map((row) => row.session_id));
    const totalAnswers = answerers.size;
    const suppressed = totalAnswers < minResponses;
    const optionBuckets = question.type === "text" || question.type === "number" || suppressed ? [] : question.options.map((option) => {
      const count = new Set(validRows.filter((row) => row.option_id === option.id).map((row) => row.session_id)).size;
      const percentage = totalAnswers ? Math.round((count / totalAnswers) * 1000) / 10 : 0;
      return {
        optionId: option.id,
        code: option.code,
        label: option.label,
        count,
        percentage,
        display: `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(percentage)} % · ${count} ${count === 1 ? "respuesta" : "respuestas"}`,
      };
    });
    const valuesBySession = new Map<string, number>();
    if (question.type === "number") {
      validRows.forEach((row) => {
        if (row.value_number != null && !valuesBySession.has(row.session_id)) valuesBySession.set(row.session_id, row.value_number);
      });
    }
    const values = [...valuesBySession.values()].sort((a, b) => a - b);
    const numericConfig = NUMERIC_REPORT_CONFIG[question.code];
    const distribution = !suppressed ? numericConfig?.ranges.map((range) => {
      const count = values.filter((value) =>
        (range.min == null || value >= range.min) && (range.max == null || value < range.max),
      ).length;
      const percentage = values.length ? Math.round((count / values.length) * 1000) / 10 : 0;
      return {
        optionId: range.code,
        code: range.code,
        label: range.label,
        count,
        percentage,
        display: `${new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(percentage)} %`,
      };
    }) : undefined;
    const numericSummary = values.length && !suppressed
      ? {
          median: percentile(values, .5),
          p25: percentile(values, .25),
          p75: percentile(values, .75),
          unit: numericConfig?.unit,
          distribution,
        }
      : undefined;
    const shownNow = question.type !== "text" && !suppressed;
    const reason = question.type === "text"
      ? "Respuesta abierta: no se publican textos individuales."
      : suppressed
        ? `Menos de ${minResponses} respuestas válidas en la selección actual.`
        : null;

    return {
      questionId: question.id,
      code: question.code,
      label: question.label,
      type: question.type,
      totalAnswers,
      validSessions: eligibleIds.size,
      suppressed,
      buckets: question.type === "number" ? distribution ?? [] : optionBuckets,
      textResponseCount: question.type === "text" ? totalAnswers : undefined,
      numericSummary,
      blockId: block.id,
      blockTitle: block.title,
      shownBefore: LEGACY_REPORTED_QUESTION_CODES.has(question.code),
      shownNow,
      reason,
    };
  });
}

export function groupReportQuestions(audit: readonly ReportQuestionAudit[]): ReportQuestionGroup[] {
  const groups = [...REPORT_BLOCKS, { id: "otros", title: "Otros resultados", intro: "Otras preguntas cerradas del cuestionario activo.", fromPosition: 0, toPosition: 0 }]
    .map((block) => ({
      id: block.id,
      title: block.title,
      intro: block.intro,
      questions: audit.filter((question) => question.blockId === block.id && question.shownNow),
    }))
    .filter((group) => group.questions.length > 0);
  return groups;
}
