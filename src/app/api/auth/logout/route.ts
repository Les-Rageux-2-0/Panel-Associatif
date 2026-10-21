import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await destroySession();
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }
  return NextResponse.json({ ok: true });
}
