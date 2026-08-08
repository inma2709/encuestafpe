import { REPORTS_MIN_N, RESULTS_MIN_N } from "@/lib/config";
import type { SampleStatus } from "./analyticsTypes";

export function getSampleStatus(nValid: number): SampleStatus {
  if (nValid < RESULTS_MIN_N) return "hidden";
  if (nValid < REPORTS_MIN_N) return "very_low";
  if (nValid < 30) return "caution";
  return "normal";
}
