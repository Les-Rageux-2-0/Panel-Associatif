import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createEmailCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
