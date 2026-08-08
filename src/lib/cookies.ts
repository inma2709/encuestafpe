import type { AstroCookies } from "astro";
import { UNLOCK_COOKIE, UNLOCK_TTL_SECONDS } from "./config";

export function setUnlockCookie(
  cookies: AstroCookies,
  studySlug: string,
  token: string,
): void {
  cookies.set(cookieName(studySlug), token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: `/estudios/${studySlug}`,
    maxAge: UNLOCK_TTL_SECONDS,
  });
}

export function getUnlockCookie(
  cookies: AstroCookies,
  studySlug: string,
): string | undefined {
  return cookies.get(cookieName(studySlug))?.value;
}

function cookieName(studySlug: string): string {
  return `${UNLOCK_COOKIE}_${studySlug.replace(/[^a-z0-9_-]/gi, "_")}`;
}
