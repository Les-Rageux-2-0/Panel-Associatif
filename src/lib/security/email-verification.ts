import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 24 * 60 * 60;
function secret() {
  const value = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET (ou SESSION_SECRET) doit contenir au moins 32 caractères pour sécuriser la validation e-mail.");
  return value;
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}
export function createEmailVerificationToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function readEmailVerificationToken(token: string): { email: string } | null {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown; exp?: unknown };
    if (typeof decoded.email !== "string" || typeof decoded.exp !== "number" || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: decoded.email.toLowerCase() };
  } catch { return null; }
}
