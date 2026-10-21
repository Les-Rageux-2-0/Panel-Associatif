import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { finalizeSignedDocument } from "@/lib/signatures";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireRole("MANAGER"); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé aux responsables." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
  try {
    const { id } = await context.params;
    const result = await finalizeSignedDocument(id, user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "DOCUMENT_NOT_FOUND" ? 404 : message === "SIGNATURES_INCOMPLETE" ? 409 : 500;
    return NextResponse.json({ error: status === 404 ? "Document introuvable." : status === 409 ? "Toutes les signatures ne sont pas encore recueillies." : "Impossible de finaliser le PDF. Vérifie le stockage R2 et les journaux serveur." }, { status });
  }
}
