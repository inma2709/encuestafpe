import { isRespondentType, type RespondentType } from "@/lib/respondent";
import type { PopulationId } from "./analyticsTypes";

export function belongsToPopulation(
  respondentType: RespondentType | null,
  population: PopulationId,
): boolean {
  if (!respondentType || !isRespondentType(respondentType)) return false;
  if (population === "ALL_RESPONDENTS") return true;
  if (population === "CURRENT_TEACHERS") return respondentType === "teacher";
  if (population === "FORMER_TEACHERS") return respondentType === "former_teacher";
  if (population === "TEACHING_EXPERIENCE") return respondentType !== "aspiring_teacher";
  return respondentType === "aspiring_teacher";
}
