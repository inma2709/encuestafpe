import type { APIRoute } from "astro";
import { setUnlockCookie } from "@/lib/cookies";
import { DomainError } from "@/types";
import { submitSurveyForm } from "@/services/submitSurveyForm";

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function statusForError(error: unknown): number {
  if (!(error instanceof DomainError)) return 500;
  if (error.code === "VALIDATION") return 400;
  if (error.code === "FORBIDDEN") return 403;
  if (error.code === "NOT_FOUND") return 404;
  if (error.code === "CLOSED") return 409;
  return 500;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const form = await request.formData();
    const studySlug = String(form.get("studySlug") ?? "");
    const result = await submitSurveyForm(form, studySlug);

    setUnlockCookie(cookies, result.studySlug, result.unlockToken);
    return json({ ok: true }, 200);
  } catch (error) {
    console.error("Survey API submission failed", error);
    return json(
      { ok: false, error: "No se ha podido enviar la encuesta. Inténtalo de nuevo." },
      statusForError(error),
    );
  }
};

export const ALL: APIRoute = async () =>
  json({ ok: false, error: "Método no permitido." }, 405);
