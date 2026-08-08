import type { SurveyQuestion } from "@/types";

export const RESPONDENT_TYPES = [
  "teacher",
  "former_teacher",
  "aspiring_teacher",
] as const;

export type RespondentType = (typeof RESPONDENT_TYPES)[number];

export function isRespondentType(value: string): value is RespondentType {
  return RESPONDENT_TYPES.includes(value as RespondentType);
}

/** The single source of truth for whether a catalog question belongs in a flow. */
export function isQuestionApplicable(
  question: Pick<SurveyQuestion, "audience">,
  respondentType: RespondentType,
): boolean {
  return question.audience === "all" || question.audience.includes(respondentType);
}
