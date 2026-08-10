import { isQuestionApplicable, type RespondentType } from "@/lib/respondent";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DomainError, type ActiveSurvey, type QuestionResult, type ReportFilters } from "@/types";
import { getSampleStatus } from "./analyticsSample";
import { getActiveSurvey } from "./getActiveSurvey";

export type AnswerRow = {
  question_id: string;
  option_id: string | null;
  value_text: string | null;
  value_number: number | null;
  session_id: string;
};

export type SessionRow = { id: string; completed_at: string; respondent_type: RespondentType | null };

export interface SurveyDataset {
  active: ActiveSurvey;
  sessions: SessionRow[];
  answers: AnswerRow[];
  optionIdByCode: Map<string, Map<string, string>>;
  optionMeta: Map<string, { code: string; label: string; questionCode: string }>;
  questionByCode: Map<string, ActiveSurvey["questions"][number]>;
}

const ANSWERS_PAGE_SIZE = 1000;
const SESSION_ID_BATCH_SIZE = 100;

async function loadAnswersForSessions(sessionIds: string[]): Promise<AnswerRow[]> {
  const admin = getSupabaseAdmin();
  const answers: AnswerRow[] = [];

  for (let start = 0; start < sessionIds.length; start += SESSION_ID_BATCH_SIZE) {
    const batch = sessionIds.slice(start, start + SESSION_ID_BATCH_SIZE);
    for (let from = 0; ; from += ANSWERS_PAGE_SIZE) {
      const { data, error } = await admin.from("answers")
        .select("question_id, option_id, value_text, value_number, session_id")
        .in("session_id", batch)
        .order("id", { ascending: true })
        .range(from, from + ANSWERS_PAGE_SIZE - 1);
      if (error) throw new DomainError(error.message, "INTERNAL");
      const page = (data ?? []) as AnswerRow[];
      answers.push(...page);
      if (page.length < ANSWERS_PAGE_SIZE) break;
    }
  }

  return answers;
}

export async function loadSurveySessions(studySlug: string) {
  const active = await getActiveSurvey(studySlug);
  const { data, error } = await getSupabaseAdmin().from("response_sessions")
    .select("id, completed_at, respondent_type")
    .eq("wave_id", active.wave.id).eq("survey_version_id", active.version.id);
  if (error) throw new DomainError(error.message, "INTERNAL");
  return { active, sessions: (data ?? []) as SessionRow[] };
}

export async function loadSurveyDataset(studySlug: string): Promise<SurveyDataset> {
  const { active, sessions } = await loadSurveySessions(studySlug);
  const answers = sessions.length ? await loadAnswersForSessions(sessions.map((session) => session.id)) : [];
  const optionIdByCode = new Map<string, Map<string, string>>();
  const optionMeta = new Map<string, { code: string; label: string; questionCode: string }>();
  const questionByCode = new Map(active.questions.map((question) => [question.code, question] as const));
  for (const question of active.questions) {
    optionIdByCode.set(question.code, new Map(question.options.map((option) => [option.code, option.id])));
    question.options.forEach((option) => optionMeta.set(option.id, { code: option.code, label: option.label, questionCode: question.code }));
  }
  return { active, sessions, answers, optionIdByCode, optionMeta, questionByCode };
}

export function parseReportFilters(params: URLSearchParams | Record<string, string | undefined>): ReportFilters {
  const get = (key: string) => params instanceof URLSearchParams ? params.get(key) || undefined : params[key] || undefined;
  return { ccaaCode: get("ccaa"), provinceCode: get("provincia"), familyCode: get("familia"), modeCode: get("modalidad"), relationCode: get("relacion"), experienceCode: get("experiencia"), sectorExperienceCode: get("experiencia-sector"), entityTypeCode: get("entidad"), fpeShareCode: get("actividad") };
}

/** Legacy adapter retained only for /resultados, which intentionally lists every question. */
export function buildQuestionResults(dataset: SurveyDataset, sessionIds: string[], minN: number): QuestionResult[] {
  const selected = new Set(sessionIds);
  return dataset.active.questions.map((question) => {
    const eligible = dataset.sessions.filter((session) => selected.has(session.id) && session.respondent_type != null && isQuestionApplicable(question, session.respondent_type));
    const eligibleIds = new Set(eligible.map((session) => session.id));
    const rows = dataset.answers.filter((answer) => answer.question_id === question.id && eligibleIds.has(answer.session_id));
    const answered = new Set(rows.map((row) => row.session_id));
    const suppressed = getSampleStatus(answered.size) === "hidden";
    if (question.type === "text" || question.type === "number") return { questionId: question.id, code: question.code, label: question.label, type: question.type, totalAnswers: answered.size, validSessions: eligible.length, suppressed, buckets: [], textResponseCount: question.type === "text" ? answered.size : undefined };
    const multi = question.type === "multi";
    const buckets = suppressed ? [] : question.options.map((option) => {
      const count = new Set(rows.filter((row) => row.option_id === option.id).map((row) => row.session_id)).size;
      const percentage = answered.size ? Math.round((count / answered.size) * 1000) / 10 : 0;
      return { optionId: option.id, code: option.code, label: option.label, count, percentage, display: `${percentage} % (n = ${count} de ${answered.size} respuestas válidas)` };
    });
    void multi;
    return { questionId: question.id, code: question.code, label: question.label, type: question.type, totalAnswers: answered.size, validSessions: eligible.length, suppressed, buckets };
  });
}

export function filterOptionsFromDataset(dataset: SurveyDataset) {
  const options = (code: string) => (dataset.questionByCode.get(code)?.options ?? []).map((option) => ({ code: option.code, label: option.label }));
  return { ccaa: options("demo_ccaa"), provinces: [], families: options("demo_family"), modes: options("teaching_mode"), relations: options("job_relation"), experiences: options("demo_experience"), sectorExperiences: options("demo_sector_experience"), entityTypes: options("job_entity_type"), fpeShares: options("job_fpe_share"), workSources: [] };
}
