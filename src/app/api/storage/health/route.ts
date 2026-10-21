import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { testR2Connection } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const result = await testR2Connection();
    return NextResponse.json({ status: "ok", storage: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    return NextResponse.json({ error: "Connexion au stockage indisponible. Vérifiez les variables R2 et les permissions du bucket." }, { status: 503 });
  }
}
