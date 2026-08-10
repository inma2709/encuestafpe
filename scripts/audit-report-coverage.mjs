import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { aggregateReportQuestions } from "../src/services/reportResults.ts";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: version, error: versionError } = await supabase
  .from("survey_versions")
  .select("id, version_label, surveys!inner(studies!inner(slug))")
  .eq("is_active", true)
  .eq("surveys.studies.slug", "docentes-fpe-2026")
  .single();
if (versionError) throw versionError;

const { data: questions, error: questionsError } = await supabase
  .from("questions")
  .select("id, code, type, label, help_text, position, audience, is_required, min_value, max_value, question_options(id, code, label, position, region_id, province_id, professional_family_id, is_active)")
  .eq("survey_version_id", version.id)
  .eq("is_active", true)
  .order("position");
if (questionsError) throw questionsError;

const { data: sessions, error: sessionsError } = await supabase
  .from("response_sessions")
  .select("id, completed_at, respondent_type")
  .eq("survey_version_id", version.id);
if (sessionsError) throw sessionsError;

const sessionIds = sessions.map((session) => session.id);
let answers = [];
if (sessionIds.length) {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("answers")
      .select("question_id, session_id, option_id, value_text, value_number")
      .in("session_id", sessionIds)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    answers.push(...data);
    if (data.length < 1000) break;
  }
}

const activeQuestions = questions.map((question) => ({
  id: question.id,
  code: question.code,
  type: question.type,
  display: question.type === "multi" ? "checkbox" : question.type === "text" ? "text" : question.type === "number" ? "number" : question.type === "likert" ? "likert" : "radio",
  label: question.label,
  helpText: question.help_text,
  position: question.position,
  required: question.is_required,
  audience: Array.isArray(question.audience) && question.audience.includes("all") ? "all" : question.audience ?? "all",
  minValue: question.min_value,
  maxValue: question.max_value,
  options: question.question_options.filter((item) => item.is_active).sort((a, b) => a.position - b.position).map((item) => ({
    id: item.id,
    code: item.code,
    label: item.label,
    position: item.position,
    regionId: item.region_id,
    provinceId: item.province_id,
    professionalFamilyId: item.professional_family_id,
  })),
}));
const dataset = {
  active: { study: { id: "", slug: "docentes-fpe-2026", title: "", summary: null, status: "open" }, wave: { id: "", label: "", opensAt: null, closesAt: null }, survey: { id: "", title: "" }, version: { id: version.id, versionLabel: version.version_label }, questions: activeQuestions },
  sessions,
  answers,
  optionIdByCode: new Map(),
  optionMeta: new Map(),
  questionByCode: new Map(activeQuestions.map((question) => [question.code, question])),
};
const audit = aggregateReportQuestions(dataset, sessions.filter((session) => session.respondent_type != null).map((session) => session.id), 5);
console.table(audit.map((question) => ({
  Pregunta: question.label,
  Codigo: question.code,
  Bloque: question.blockTitle,
  Tipo: question.type,
  Respuestas: question.totalAnswers,
  "Antes": question.shownBefore ? "sí" : "no",
  "Ahora": question.shownNow ? "sí" : "no",
  Motivo: question.reason ?? "—",
})));
console.log({
  version: version.version_label,
  storedSessions: sessions.length,
  reportableSessions: sessions.filter((session) => session.respondent_type != null).length,
  questions: audit.length,
  closedQuestions: audit.filter((question) => question.type !== "text").length,
  shownNow: audit.filter((question) => question.shownNow).length,
  notShown: audit.filter((question) => !question.shownNow).length,
});
