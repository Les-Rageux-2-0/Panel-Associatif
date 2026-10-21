"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type LinkItem = { id: string; status: string; relationship: string; parent: { name: string; email: string }; player: { id: string; name: string; email: string; birthDate: string | null } };
export default function ParentSpacePage() {
  const [playerEmail, setPlayerEmail] = useState("");
  const [relationship, setRelationship] = useState("representant_legal");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() { const r = await fetch("/api/parents/links"); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Impossible de charger les rattachements."); setLinks(d.links); }
  useEffect(() => { refresh().catch(e => setError(e.message)); }, []);
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(""); setMessage(""); try { const r = await fetch("/api/parents/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerEmail, relationship }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setMessage(d.message); setPlayerEmail(""); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Erreur."); } finally { setBusy(false); } }

  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10"><Link href="/tableau-de-bord" className="text-sm text-[var(--muted)]">← Tableau de bord</Link><h1 className="mt-5 text-3xl font-semibold">Espace Parent</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Le rattachement donne uniquement accès aux documents autorisés. Toute demande doit être validée par un administrateur OWNER ou ADMIN.</p>
    <form onSubmit={submit} className="mt-7 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="text-lg font-semibold">Demander un rattachement</h2><label className="block text-sm">Adresse e-mail du compte Joueur<input required type="email" value={playerEmail} onChange={e => setPlayerEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" placeholder="rageux014@gmail.com" /></label><label className="block text-sm">Lien avec le joueur<select value={relationship} onChange={e => setRelationship(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3"><option value="representant_legal">Représentant légal</option><option value="mere">Mère</option><option value="pere">Père</option><option value="tuteur_legal">Tuteur légal</option><option value="autre">Autre (à vérifier)</option></select></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-emerald-300">{message}</p>}<button disabled={busy} className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[#171821] disabled:opacity-60">{busy ? "Envoi…" : "Envoyer la demande"}</button></form>
    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="text-lg font-semibold">Mes rattachements</h2>{links.length === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">Aucun rattachement pour le moment.</p> : <div className="mt-4 space-y-3">{links.map(link => <div key={link.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4"><div><div className="font-medium">{link.player.name}</div><div className="text-sm text-[var(--muted)]">{link.player.email} · {link.relationship}</div></div><span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">{link.status === "ACTIVE" ? "Validé" : link.status === "REJECTED" ? "Refusé" : "En attente"}</span>{link.status === "PENDING" && <span className="text-xs text-[var(--muted)]">En attente de validation administrative</span>}</div>)}</div>}</section>
  </main>;
}
