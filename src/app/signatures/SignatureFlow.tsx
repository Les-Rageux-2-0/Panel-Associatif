"use client";

import { useCallback, useEffect, useState } from "react";

type SessionData = {
  signer: { fullName: string; email: string; role: string; status: string; signingOrder: number };
  document: { id: string; reference: string; title: string; status: string; pdfUrl: string | null };
  canAct: boolean;
  reason: string | null;
  codeTtlHours: number;
};

export default function SignatureFlow({ token }: { token: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalizationPending, setFinalizationPending] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) { setError("Le lien de signature ne contient pas de jeton valide."); return; }
    const response = await fetch(`/api/signatures/session?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Lien de signature invalide.");
    setSession(data);
  }, [token]);

  useEffect(() => { refresh().catch(e => setError(e instanceof Error ? e.message : "Impossible de charger le document.")); }, [refresh]);

  async function sendCode() {
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/signatures/request-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Envoi du code impossible.");
      setCodeSent(true); setVerified(false); setMessage(data.message ?? "Code envoyé.");
    } catch (e) { setError(e instanceof Error ? e.message : "Envoi du code impossible."); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/signatures/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Code incorrect.");
      setVerified(true); setMessage("Code vérifié. Confirme ta signature dans les 15 minutes.");
    } catch (e) { setError(e instanceof Error ? e.message : "Vérification impossible."); }
    finally { setBusy(false); }
  }

  async function sign() {
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/signatures/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, consent }) });
      const data = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(data.error ?? "Signature impossible.");
      setCompleted(true); setFinalizationPending(data.finalPdfReady === false); setMessage(data.finalPdfReady ? "Signature enregistrée. Le PDF final est prêt." : data.message ?? "Signature enregistrée.");
      setVerified(false); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Signature impossible."); }
    finally { setBusy(false); }
  }

  const signed = completed || session?.signer.status === "SIGNED";
  const waiting = session?.reason === "WAITING_FOR_PREVIOUS_SIGNERS";

  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
    <a href="/" className="text-sm text-[var(--muted)]">← Accueil</a>
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Les Rageux 2.0</p>
      <h1 className="mt-3 text-3xl font-semibold">Signature électronique</h1>
      {!session && !error && <p className="mt-5 text-sm text-[var(--muted)]">Chargement de l'invitation…</p>}
      {session && <>
        <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Document à signer</p>
          <h2 className="mt-2 text-xl font-semibold">{session.document.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Référence : {session.document.reference}</p>
          <p className="mt-3 text-sm">Signataire : <strong>{session.signer.fullName}</strong></p>
          <p className="mt-1 text-sm text-[var(--muted)]">E-mail de vérification : {session.signer.email}</p>
          {session.document.pdfUrl && <a href={session.document.pdfUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm">Consulter le PDF du document</a>}
        </div>
        {signed ? <div className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4"><h2 className="font-semibold text-emerald-200">Signature enregistrée</h2><p className="mt-2 text-sm">{finalizationPending ? "Toutes les signatures sont enregistrées, mais la génération du PDF final doit être relancée par un responsable." : session.document.status === "SIGNED" ? "Toutes les signatures requises sont recueillies." : "Ta signature est enregistrée. Les autres signataires doivent terminer le parcours."}</p>{session.document.status === "SIGNED" && session.document.pdfUrl && <a href={session.document.pdfUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#171821]">Télécharger le PDF signé</a>}</div>
        : waiting ? <p className="mt-6 rounded-xl border border-amber-700 p-4 text-sm">Le signataire précédent doit terminer avant que tu puisses signer.</p>
        : !session.canAct ? <p className="mt-6 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">Cette invitation n'est plus active ou le document ne peut pas être signé. Statut : {session.signer.status}.</p>
        : <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-[var(--border)] p-4"><h2 className="font-semibold">1. Vérifier ton adresse e-mail</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Un code à usage unique sera envoyé à l'adresse masquée affichée ci-dessus. Il expire 72 heures après son émission. Après vérification, tu disposeras de 15 minutes pour confirmer la signature.</p><button disabled={busy} onClick={sendCode} className="mt-4 rounded-xl border border-[var(--border)] px-4 py-3 text-sm disabled:opacity-50">{busy ? "Envoi…" : codeSent ? "Renvoyer un code" : "Recevoir mon code par e-mail"}</button></div>
          {codeSent && <form onSubmit={verifyCode} className="rounded-xl border border-[var(--border)] p-4"><h2 className="font-semibold">2. Saisir le code</h2><label className="mt-3 block text-sm">Code à 6 chiffres<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3 text-lg tracking-[0.35em]" /></label><button disabled={busy || code.length !== 6} className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#171821] disabled:opacity-50">{busy ? "Vérification…" : "Vérifier le code"}</button></form>}
          {verified && <div className="rounded-xl border border-[var(--border)] p-4"><h2 className="font-semibold">3. Consentement et signature</h2><label className="mt-3 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 size-4" /><span>J'ai consulté le document et confirme mon intention de le signer électroniquement. J'accepte l'enregistrement de la preuve de vérification par code e-mail, de la date et de l'empreinte du document.</span></label><button disabled={busy || !consent} onClick={sign} className="mt-4 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[#171821] disabled:opacity-50">{busy ? "Signature…" : "Confirmer et signer le document"}</button></div>}
        </div>}
      </>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-[var(--border)] p-4 text-sm">{message}</p>}
      <p className="mt-6 text-xs leading-5 text-[var(--muted)]">Le portail enregistre les événements de vérification, le consentement, l'horodatage et l'empreinte du document. Ce parcours ne prétend pas, à lui seul, constituer une signature électronique qualifiée au sens du règlement eIDAS.</p>
    </div>
  </main>;
}
