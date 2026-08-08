import { RESULTS_MIN_N } from "@/lib/config";
import { hashUnlockToken } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DomainError, type ResultsView } from "@/types";
import {
  buildQuestionResults,
  loadSurveyDataset,
} from "./analytics";
import { getActiveSurvey } from "./getActiveSurvey";

export async function assertUnlockToken(
  studySlug: string,
  token: string | undefined,
): Promise<void> {
  if (await isUnlockTokenValid(studySlug, token)) return;
  throw new DomainError(
    "Completa la encuesta para ver los resultados",
    "FORBIDDEN",
  );
}

export async function isUnlockTokenValid(
  studySlug: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;

  const active = await getActiveSurvey(studySlug);
  const admin = getSupabaseAdmin();
  const tokenHash = hashUnlockToken(token);

  const { data, error } = await admin
    .from("response_sessions")
    .select("id")
    .eq("study_id", active.study.id)
    .eq("unlock_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw new DomainError(error.message, "INTERNAL");
  }
  return !!data;
}

export async function getResults(studySlug: string): Promise<ResultsView> {
  const dataset = await loadSurveyDataset(studySlug);
  const sessionIds = dataset.sessions.map((s) => s.id);
  const questions = buildQuestionResults(dataset, sessionIds, RESULTS_MIN_N);

  return {
    studySlug: dataset.active.study.slug,
    studyTitle: dataset.active.study.title,
    waveLabel: dataset.active.wave.label,
    totalSessions: sessionIds.length,
    minN: RESULTS_MIN_N,
    questions,
  };
}
