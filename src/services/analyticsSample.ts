import { MIN_REPORT_RESPONSES, REPORTS_CAUTION_N } from "@/lib/config";
import type { SampleStatus } from "./analyticsTypes";

export function getSampleStatus(nValid: number): SampleStatus {
  if (nValid < MIN_REPORT_RESPONSES) return "hidden";
  if (nValid < REPORTS_CAUTION_N) return "very_low";
  if (nValid < 30) return "caution";
  return "normal";
}
