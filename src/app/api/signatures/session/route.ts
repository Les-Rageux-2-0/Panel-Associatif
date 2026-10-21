import { NextResponse } from "next/server";
import { getSignerByInvitationToken, signerCanAct } from "@/lib/signatures";
import { createPrivateDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const signer = await getSignerByInvitationToken(token);
  if (!signer) return NextResponse.json({ error: "Lien d'invitation invalide ou révoqué." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const doc = signer.document;
  let pdfUrl: string | null = null;
  const key = doc.pdfFinalKey ?? doc.pdfOriginalKey;
  if (key) {
    try { pdfUrl = await createPrivateDownloadUrl(key, 120, `${doc.reference}.pdf`); }
    catch { return NextResponse.json({ error: "Le stockage documentaire est indisponible." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  }
  const eligibility = signerCanAct(signer);
  const maskedEmail = signer.email.replace(/^(.{1,2})[^@]*(@.*)$/, "$1•••$2");
  return NextResponse.json({
    signer: { fullName: signer.fullName, email: maskedEmail, role: signer.role, status: signer.status, signingOrder: signer.signingOrder },
    document: { id: doc.id, reference: doc.reference, title: doc.title, status: doc.status, pdfUrl },
    canAct: eligibility.ok,
    reason: eligibility.ok ? null : eligibility.reason,
    codeTtlHours: 72
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
