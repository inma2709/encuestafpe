import { createHash, randomBytes } from "node:crypto";
import { requireEnv } from "./config";

export function createUnlockToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashUnlockToken(token: string): string {
  const secret = requireEnv("SURVEY_UNLOCK_SECRET");
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}
