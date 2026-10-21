"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Field = { key: string; label: string; type: "text" | "textarea" | "email" | "date" | "number" | "checkbox"; required: boolean };
type Template = { id: string; type: string; name: string; description: string | null; version: number; fields: Field[]; bodyTemplate: string };
type RecipientUser = {id:string;name:string;email:string;role:string};
const typeLabels: Record<string, string> = {
  PLAYER_VOLUNTEER_ADULT: "Contrat Joueur Bénévole Majeur", ROSTER_CONTRACT: "Contrat Roster", RECRUITER_CONTRACT: "Contrat Recruteur",
  PLAYER_MINOR: "Contrat Joueur Mineur", PARENTAL_AUTHORIZATION: "Autorisation parentale", SUSPENSION_NOTICE: "Mise à pied",
  DONATION_RECEIPT: "Reçu de don", ACCOUNTING_LEDGER: "Cahier de tenue des comptes"
};

export default function NewDocumentPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [recipientUserIds, setRecipientUserIds] = useState("");
  const [recipientUsers,setRecipientUsers] = useState<RecipientUser[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdDocumentId, setCreatedDocumentId] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");
  const selected = templates.find(template => template.id === templateId) ?? null;

  useEffect(() => {
    let active = true;
    fetch("/api/admin/documents",{cache:"no-store"}).then(async response=>{const data=await response.json();if(response.ok&&active)setRecipientUsers(data.users as RecipientUser[])}).catch(()=>undefined);
    fetch("/api/admin/templates").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Chargement des modèles impossible.");
      if (!active) return;
      setTemplates(data.templates as Template[]);
      if (data.templates[0]) { const requested = new URLSearchParams(window.location.search).get("template"); setTemplateId(data.templates.some((t: Template) => t.id === requested) ? requested! : data.templates[0].id); }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Chargement des modèles impossible."); }).finally(() => { if (active) setLoadingTemplates(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { setValues({}); setTitle(selected?.name ?? ""); }, [templateId]);
  const preview = useMemo(() => {
    if (!selected) return "";
    return selected.bodyTemplate.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_match, key: string) => {
      const field = selected.fields.find(item => item.key === key);
      const value = values[key];
      if (value === undefined || value === "" || value === false) return `[${field?.label ?? key}]`;
      return String(value);
    });
  }, [selected, values]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const response = await fetch("/api/admin/documents/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId, title, recipientUserIds, values }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Création du document impossible.");
      setCreatedDocumentId(data.document.id);
      setPdfMessage("");
      setSuccess(`Document créé : ${data.document.reference}. Tu peux maintenant générer son PDF de brouillon.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Création du document impossible."); }
    finally { setLoading(false); }
  }

  async function generatePdf() {
    if (!createdDocumentId) return;
    setGeneratingPdf(true); setPdfMessage(""); setError("");
    try {
      const response = await fetch(`/api/admin/documents/${encodeURIComponent(createdDocumentId)}/pdf`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Génération du PDF impossible.");
      setPdfMessage(`PDF généré et archivé dans le stockage privé. Empreinte SHA-256 : ${data.contentHash}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Génération du PDF impossible."); }
    finally { setGeneratingPdf(false); }
  }

  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
    <Link href="/admin/documents" className="text-sm text-[var(--muted)]">← Gestion des documents</Link>
    <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-[#D7B65D]">Les Rageux 2.0</p><h1 className="mt-2 text-3xl font-semibold">Créer un document</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Choisis un modèle, remplis les champs puis attribue le document aux comptes concernés. La référence officielle est générée côté serveur et reste unique par catégorie et par année.</p>
    {loadingTemplates ? <p className="mt-8 text-sm text-[var(--muted)]">Chargement des modèles…</p> : templates.length === 0 ? <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="text-xl font-semibold">Aucun modèle disponible</h2><p className="mt-2 text-sm text-[var(--muted)]">Crée d'abord un modèle pour l'une des huit catégories.</p><Link href="/admin/modeles" className="mt-4 inline-flex rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#171821]">Créer un modèle</Link></section> : <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-semibold">Informations du document</h2>
        <label className="block text-sm">Modèle<select required value={templateId} onChange={e => setTemplateId(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3">{templates.map(template => <option key={template.id} value={template.id}>{typeLabels[template.type] ?? template.type} — {template.name} (v{template.version})</option>)}</select></label>
        {selected?.description && <p className="text-sm text-[var(--muted)]">{selected.description}</p>}
        <label className="block text-sm">Titre du document<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /></label>
        <fieldset className="rounded-xl border border-[var(--border)] p-4"><legend className="px-2 text-sm">Attribuer aux comptes (facultatif)</legend><p className="mb-3 text-xs text-[var(--muted)]">Sélectionne les membres ou parents autorisés à consulter le document.</p><div className="max-h-48 space-y-2 overflow-auto">{recipientUsers.map(u=>{const selectedIds=recipientUserIds.split(",").filter(Boolean);return <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] p-2 text-sm"><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={e=>setRecipientUserIds(current=>{const ids=current.split(",").filter(Boolean);return e.target.checked?[...new Set([...ids,u.id])].join(","):ids.filter(id=>id!==u.id).join(",")})}/><span className="min-w-0 flex-1"><span className="block">{u.name}</span><span className="block text-xs text-[var(--muted)]">{u.email}</span></span><span className="text-xs text-[#D7B65D]">{u.role}</span></label>})}{recipientUsers.length===0&&<p className="text-xs text-[var(--muted)]">Aucun compte actif disponible.</p>}</div></fieldset>
        <div className="border-t border-[var(--border)] pt-5"><h3 className="font-semibold">Champs à remplir</h3>{selected?.fields.length ? <div className="mt-4 space-y-4">{selected.fields.map(field => <label key={field.key} className="block text-sm">{field.label}{field.required && <span className="ml-1 text-[#D7B65D]">*</span>}{field.type === "textarea" ? <textarea required={field.required} value={String(values[field.key] ?? "")} onChange={e => setValues(current => ({ ...current, [field.key]: e.target.value }))} rows={3} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /> : field.type === "checkbox" ? <span className="mt-2 flex items-center gap-2"><input type="checkbox" checked={values[field.key] === true} onChange={e => setValues(current => ({ ...current, [field.key]: e.target.checked }))} />Oui</span> : <input required={field.required} type={field.type} value={String(values[field.key] ?? "")} onChange={e => setValues(current => ({ ...current, [field.key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" />}</label>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">Ce modèle ne contient aucun champ.</p>}</div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{success && <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</p>}{pdfMessage && <p role="status" className="break-all rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{pdfMessage}</p>}
        {createdDocumentId && <button type="button" onClick={generatePdf} disabled={generatingPdf} className="ml-3 rounded-xl border border-[var(--border)] px-5 py-3 font-semibold disabled:opacity-60">{generatingPdf ? "Génération du PDF…" : "Générer le PDF de brouillon"}</button>}
        <button disabled={loading || !selected} className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[#171821] disabled:opacity-60">{loading ? "Création…" : "Créer le document en brouillon"}</button>
      </section>
      <aside className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="text-xl font-semibold">Aperçu du contenu</h2><p className="mt-2 text-xs text-[var(--muted)]">Les champs non renseignés apparaissent entre crochets. Cet aperçu n'est pas encore un PDF officiel.</p><pre className="mt-4 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[#101116] p-4 font-sans text-sm leading-6">{preview || "Sélectionne un modèle pour afficher l'aperçu."}</pre></aside>
    </form>}
  </main>;
}
