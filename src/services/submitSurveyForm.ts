import type { AnswerInput, SubmitSurveyResult } from "@/types";
import { getActiveSurvey } from "./getActiveSurvey";
import { submitSurvey } from "./submitSurvey";
import { isQuestionApplicable, isRespondentType } from "@/lib/respondent";
import { DomainError } from "@/types";

/** Converts the browser form payload into validated survey answers before saving it. */
export async function submitSurveyForm(
  form: FormData,
  fallbackStudySlug: string,
): Promise<SubmitSurveyResult> {
  const studySlug = String(form.get("studySlug") ?? fallbackStudySlug);
  const website = String(form.get("website") ?? "");
  const durationRaw = String(form.get("durationMs") ?? "0");
  const durationMs = Number.parseInt(durationRaw, 10);
  const active = await getActiveSurvey(studySlug);
  const answers: AnswerInput[] = [];
  const profileQuestion = active.questions.find((question) => question.code === "respondent_type");
  const profileValue = profileQuestion ? String(form.get(`q_${profileQuestion.id}`) ?? "") : "";
  const profileCode = String(form.get("respondent_type") ?? "");
  const profileOption = profileQuestion?.options.find(
    (option) => option.id === profileValue || option.code === profileCode,
  );
  const respondentType = profileOption?.code ?? "";

  if (!profileQuestion || !profileOption || !isRespondentType(respondentType)) {
    throw new DomainError("Selecciona tu relación con la FPE", "VALIDATION");
  }

  for (const question of active.questions) {
    if (!isQuestionApplicable(question, respondentType)) continue;
    const key = `q_${question.id}`;

    if (question.type === "multi") {
      const values = form.getAll(key).map(String).filter(Boolean);
      if (values.length > 0 || question.required) {
        answers.push({ questionId: question.id, optionIds: values });
      }
      continue;
    }

    const value = question.id === profileQuestion.id ? profileOption.id : form.get(key);
    if (value == null || String(value).trim() === "") continue;

    if (question.type === "text") {
      answers.push({ questionId: question.id, valueText: String(value) });
    } else if (question.type === "number") {
      answers.push({ questionId: question.id, valueNumber: Number(value) });
    } else {
      answers.push({ questionId: question.id, optionId: String(value) });
    }
  }

  return submitSurvey({
    studySlug,
    answers,
    website,
    durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
  });
}
