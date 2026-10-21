"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SignerInput = { fullName: string; email: string; role: string; signingOrder: number };
type SignerView = { id: string; fullName: string; email: string; role: string; status: string; signingOrder: number; invitedAt: string | null; signedAt: string | null };
type DocumentView = { id: string; reference: string; title: string; status: string; createdAt: string; sentAt: string | null; signers: SignerView[] };
const roleOptions = [
  ["PLAYER", "Joueur"], ["RECRUITER", "Recruteur"], ["ROSTER_MANAGER", "Responsable roster"],
  ["LEGAL_GUARDIAN", "Représentant légal"], ["TEAM_REPRESENTATIVE", "Représentant de la structure"], ["DONOR", "Donateur"], ["OTHER", "Autre"]
];
const blankSigner = (): SignerInput => ({ fullName: "", email: "", role: "PLAYER", signingOrder: 1 });
const statusLabel: Record<string, string> = { DRAFT: "Brouillon", PENDING_SIGNATURES: "En attente de signatures", PARTIALLY_SIGNED: "Partiellement signé", SIGNED: "Signé", PENDING: "En attente", VERIFIED: "Vérifié", REFUSED: "Refusé", EXPIRED: "Expiré", CANCELLED: "Annulé" };

export default function AdminSignaturesPage() {
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [signers, setSigners] = useState<SignerInput[]>([blankSigner()]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/signatures", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Impossible de charger les documents.");
    setDocuments(data.documents ?? []);
    setSelectedId(current => data.documents?.some((d: DocumentView) => d.id === current && d.status === "DRAFT") ? current : (data.documents?.find((d: DocumentView) => d.status === "DRAFT")?.id ?? ""));
  }, []);

  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : "Erreur de chargement.")); }, [load]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/admin/signatures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: selectedId, signers }) });
      const data = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(data.error ?? "Invitation impossible.");
      const sent = (data.results ?? []).filter((r: { sent: boolean }) => r.sent).length;
      const failed = (data.results ?? []).filter((r: { sent: boolean }) => !r.sent).length;
      setMessage(`${sent} invitation(s) envoyée(s)${failed ? ` ; ${failed} échec(s), vérifie la configuration SMTP puis utilise « Renvoyer ».` : "."}`);
      setSigners([blankSigner()]);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Invitation impossible."); }
    finally { setBusy(false); }
  }

  async function resend(documentId: string) {
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/admin/signatures/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId }) });
      const data = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(data.error ?? "Renvoi impossible.");
      const sent = (data.results ?? []).filter((r: { sent: boolean }) => r.sent).length;
      setMessage(`${sent}/${(data.results ?? []).length} invitation(s) renvoyée(s).`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Renvoi impossible."); }
    finally { setBusy(false); }
  }

  async function finalize(documentId: string) {
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch(`/api/admin/documents/${encodeURIComponent(documentId)}/finalize`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Finalisation impossible.");
      setMessage(`PDF final archivé pour ${data.reference}.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Finalisation impossible."); }
    finally { setBusy(false); }
  }

  const draftDocs = documents.filter(d => d.status === "DRAFT");

  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <Link href="/admin/documents" className="text-sm text-[var(--muted)]">← Gestion des documents</Link>
    <h1 className="mt-5 text-3xl font-semibold">Signatures électroniques</h1>
    <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">Invite les signataires depuis le portail. Chaque personne reçoit un lien individuel, puis demande un code envoyé à son e-mail, valable 72 heures. Le consentement explicite est enregistré séparément.</p>

    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-xl font-semibold">Inviter des signataires</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Le document doit être un brouillon avec un PDF généré. L'ordre 1 signe avant l'ordre 2 ; des personnes ayant le même ordre peuvent signer en parallèle.</p>
      {draftDocs.length === 0 ? <p className="mt-5 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">Aucun brouillon avec PDF disponible. Génère d'abord un PDF depuis la page Documents.</p> : <form onSubmit={invite} className="mt-5 space-y-5">
        <label className="block text-sm">Document<select required value={selectedId} onChange={e => setSelectedId(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3">{draftDocs.map(d => <option key={d.id} value={d.id}>{d.reference} — {d.title}</option>)}</select></label>
        {signers.map((signer, index) => <div key={index} className="rounded-xl border border-[var(--border)] p-4">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Signataire {index + 1}</h3>{signers.length > 1 && <button type="button" onClick={() => setSigners(current => current.filter((_, i) => i !== index))} className="text-sm text-red-300">Supprimer</button>}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Nom complet<input required maxLength={160} value={signer.fullName} onChange={e => setSigners(current => current.map((s, i) => i === index ? { ...s, fullName: e.target.value } : s))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-3 py-2.5" /></label>
            <label className="block text-sm">E-mail<input required type="email" maxLength={254} value={signer.email} onChange={e => setSigners(current => current.map((s, i) => i === index ? { ...s, email: e.target.value } : s))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-3 py-2.5" /></label>
            <label className="block text-sm">Rôle<select value={signer.role} onChange={e => setSigners(current => current.map((s, i) => i === index ? { ...s, role: e.target.value } : s))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-3 py-2.5">{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-sm">Ordre de signature<input type="number" min={1} max={10} required value={signer.signingOrder} onChange={e => setSigners(current => current.map((s, i) => i === index ? { ...s, signingOrder: Number(e.target.value) } : s))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-3 py-2.5" /><span className="mt-1 block text-xs text-[var(--muted)]">1 = premier signataire</span></label>
          </div>
        </div>)}
        <div className="flex flex-wrap gap-3"><button type="button" disabled={signers.length >= 10} onClick={() => setSigners(current => [...current, blankSigner()])} className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm disabled:opacity-50">+ Ajouter un signataire</button><button disabled={busy || !selectedId} className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[#171821] disabled:opacity-60">{busy ? "Envoi en cours…" : "Envoyer les invitations"}</button></div>
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
    </section>

    <section className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold">Suivi des signatures</h2>
      {documents.map(doc => <article key={doc.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{doc.reference}</p><h3 className="mt-1">{doc.title}</h3><p className="mt-1 text-sm text-[var(--muted)]">Statut : {statusLabel[doc.status] ?? doc.status}</p></div><div className="flex gap-2">{["PENDING_SIGNATURES", "PARTIALLY_SIGNED"].includes(doc.status) && doc.signers.some(s => s.status === "PENDING") && <button disabled={busy} onClick={() => resend(doc.id)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-50">Renvoyer les invitations</button>}{doc.signers.length > 0 && doc.signers.every(s => s.status === "SIGNED") && doc.status !== "SIGNED" && <button disabled={busy} onClick={() => finalize(doc.id)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#171821] disabled:opacity-50">Finaliser le PDF</button>}</div></div>
        {doc.signers.length > 0 ? <ul className="mt-4 space-y-2">{doc.signers.map(s => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-sm"><span>{s.fullName} · {s.email} · ordre {s.signingOrder}</span><span className="text-[var(--muted)]">{statusLabel[s.status] ?? s.status}{s.signedAt ? ` · ${new Date(s.signedAt).toLocaleString("fr-FR")}` : ""}</span></li>)}</ul> : <p className="mt-3 text-sm text-[var(--muted)]">Aucun signataire invité.</p>}
      </article>)}
      {!documents.length && <p className="rounded-xl border border-[var(--border)] p-5 text-sm text-[var(--muted)]">Aucun document PDF éligible pour le moment.</p>}
    </section>
  </main>;
}
