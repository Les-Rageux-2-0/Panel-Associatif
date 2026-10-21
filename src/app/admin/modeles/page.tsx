"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const types = [
  ["PLAYER_VOLUNTEER_ADULT", "Contrat Joueur Bénévole Majeur"],
  ["ROSTER_CONTRACT", "Contrat Roster"],
  ["RECRUITER_CONTRACT", "Contrat Recruteur"],
  ["PLAYER_MINOR", "Contrat Joueur Mineur"],
  ["PARENTAL_AUTHORIZATION", "Autorisation parentale pour mineur"],
  ["SUSPENSION_NOTICE", "Mise à pied"],
  ["DONATION_RECEIPT", "Reçu de don"],
  ["ACCOUNTING_LEDGER", "Cahier de tenue des comptes"]
];
type FieldType = "text" | "textarea" | "email" | "date" | "number" | "checkbox";
type Field = { key: string; label: string; type: FieldType; required: boolean };
type ExistingTemplate = { id: string; type: string; name: string; description: string | null; version: number; fields: Field[]; createdAt: string };
const categoryNames: Record<string, string> = Object.fromEntries(types.map(([value, label]) => [value, label]));

function makeKey(label: string) {
  return label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").replace(/^[^a-zA-Z]+/, "").slice(0, 40) || "champ";
}

export default function AdminModelesPage() {
  const [templates, setTemplates] = useState<ExistingTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [listError, setListError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(types[0][0]);
  const [description, setDescription] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("CONTRAT — LES RAGEUX 2.0\n\nEntre les soussignés,\n\nNom et prénom : {{nom_prenom}}\nPseudonyme : {{pseudo}}\n\nLes parties déclarent avoir pris connaissance des conditions ci-dessous.\n\nObjet et conditions\n{{conditions}}\n\nFait le {{date_signature}}.\n\nSignature du membre :\nSignature du représentant de la structure :");
  const [fields, setFields] = useState<Field[]>([
    { key: "nom_prenom", label: "Nom et prénom", type: "text", required: true },
    { key: "pseudo", label: "Pseudonyme", type: "text", required: true },
    { key: "conditions", label: "Conditions particulières", type: "textarea", required: false },
    { key: "date_signature", label: "Date", type: "date", required: true }
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/templates")
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Impossible de charger les modèles.");
        if (active) setTemplates(data.templates as ExistingTemplate[]);
      })
      .catch(e => { if (active) setListError(e instanceof Error ? e.message : "Impossible de charger les modèles."); })
      .finally(() => { if (active) setLoadingTemplates(false); });
    return () => { active = false; };
  }, []);

  const visibleTemplates = templates.filter(template =>
    `${template.name} ${template.description ?? ""} ${categoryNames[template.type] ?? template.type}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))
  );

  function addField() {
    let base = "nouveau_champ";
    let key = base;
    let i = 2;
    while (fields.some(f => f.key === key)) key = `${base}_${i++}`;
    setFields([...fields, { key, label: "Nouveau champ", type: "text", required: false }]);
  }
  function updateField(index: number, patch: Partial<Field>) {
    setFields(current => current.map((field, i) => i === index ? { ...field, ...patch } : field));
  }
  function updateLabel(index: number, label: string) {
    const old = fields[index];
    const suggested = makeKey(label);
    const keyAvailable = !fields.some((field, i) => i !== index && field.key === suggested);
    updateField(index, { label, ...(old.key === makeKey(old.label) && keyAvailable ? { key: suggested } : {}) });
  }
  function removeField(index: number) { setFields(current => current.filter((_, i) => i !== index)); }

  async function archiveTemplate(template: ExistingTemplate) {
    if (!window.confirm(`Archiver le modèle « ${template.name} » ? Les documents déjà créés resteront conservés.`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: template.id, action: "ARCHIVE" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Archivage impossible.");
      setMessage(`Modèle « ${template.name} » archivé. Les documents existants sont conservés.`);
      const refreshed = await fetch("/api/admin/templates");
      if (refreshed.ok) { const latest = await refreshed.json(); setTemplates(latest.templates as ExistingTemplate[]); }
    } catch (e) { setError(e instanceof Error ? e.message : "Archivage impossible."); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try {
      const response = await fetch("/api/admin/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type, description, bodyTemplate, fields }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Création du modèle impossible.");
      setMessage(`Modèle « ${data.template.name} » créé en version ${data.template.version}. Vous pouvez maintenant créer un document à partir de ce modèle.`);
      setName(""); setDescription("");
      const refreshed = await fetch("/api/admin/templates");
      if (refreshed.ok) { const latest = await refreshed.json(); setTemplates(latest.templates as ExistingTemplate[]); }
      setShowAdvanced(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Création du modèle impossible."); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8">
    <Link href="/admin/documents" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">← Gestion des documents</Link>
    <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D7B65D]">LES RAGEUX 2.0 · ADMINISTRATION</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Modèles de documents</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Choisis un document déjà rédigé et utilise-le. Les champs personnels seront demandés à l’étape suivante.</p>
      </div>
      <Link href="/admin/documents/nouveau" className="inline-flex items-center justify-center rounded-xl bg-[#D7B65D] px-4 py-3 text-sm font-semibold text-[#17150F] hover:bg-[#E8CC7E]">+ Créer un document</Link>
    </div>

    <section className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-semibold">Bibliothèque de modèles</h2><p className="mt-1 text-sm text-[var(--muted)]">{loadingTemplates ? "Chargement…" : `${templates.length} modèle${templates.length > 1 ? "s" : ""} disponible${templates.length > 1 ? "s" : ""}`}</p></div>
        <label className="block w-full sm:max-w-sm"><span className="sr-only">Rechercher un modèle</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un document…" className="w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3 text-sm outline-none focus:border-[#D7B65D]" /></label>
      </div>
      {listError && <p role="alert" className="mt-4 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">{listError}</p>}
      {loadingTemplates ? <p className="py-10 text-center text-sm text-[var(--muted)]">Chargement des modèles…</p> : visibleTemplates.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-8 text-center"><p className="font-medium">Aucun modèle trouvé</p><p className="mt-1 text-sm text-[var(--muted)]">Essaie une autre recherche ou crée un modèle personnalisé.</p></div> : <div className="mt-4 divide-y divide-[var(--border)]">
        {visibleTemplates.map(template => <article key={template.id} className="flex flex-col gap-3 py-4 first:pt-2 last:pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D7B65D]/30 bg-[#D7B65D]/10 text-[#D7B65D]" aria-hidden="true"><span className="text-lg">▤</span></div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{template.name}</h3><span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)]">v{template.version}</span></div><p className="mt-1 text-xs text-[#D7B65D]">{categoryNames[template.type] ?? template.type}</p>{template.description && <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--muted)]">{template.description}</p>}<p className="mt-2 text-xs text-[var(--muted)]">{template.fields?.length ?? 0} champ(s) à remplir</p></div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2"><Link href={`/admin/documents/nouveau?template=${encodeURIComponent(template.id)}`} className="inline-flex items-center justify-center rounded-lg border border-[#D7B65D]/50 px-3 py-2 text-sm font-medium text-[#E5C56C] transition hover:bg-[#D7B65D]/10">Utiliser ce modèle <span className="ml-2" aria-hidden="true">→</span></Link><button type="button" onClick={() => void archiveTemplate(template)} className="inline-flex items-center justify-center rounded-lg border border-[#593631] px-3 py-2 text-sm text-[#d6a29a] hover:bg-[#2a1715]">Archiver</button></div>
        </article>)}
      </div>}
    </section>

    <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <button type="button" onClick={() => setShowAdvanced(v => !v)} aria-expanded={showAdvanced} className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"><div><h2 className="font-semibold">Créer un modèle personnalisé</h2><p className="mt-1 text-sm text-[var(--muted)]">À utiliser uniquement si tu veux rédiger un nouveau document ou modifier sa structure.</p></div><span className="text-lg text-[#D7B65D]">{showAdvanced ? "−" : "+"}</span></button>
      {showAdvanced && <form onSubmit={submit} className="space-y-6 border-t border-[var(--border)] p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm">Nom du modèle<input required maxLength={180} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Contrat joueur majeur — standard" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /></label><label className="block text-sm">Catégorie<select value={type} onChange={e => setType(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3">{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <label className="block text-sm">Description (facultative)<textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={2000} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /></label>
        <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Champs du formulaire</h3><p className="mt-1 text-xs text-[var(--muted)]">Chaque clé correspond à une variable du texte, par exemple <code>{"{{nom_prenom}}"}</code>.</p></div><button type="button" onClick={addField} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">+ Ajouter un champ</button></div>
        {fields.map((field, index) => <div key={`${field.key}-${index}`} className="grid gap-3 rounded-xl border border-[var(--border)] p-4 md:grid-cols-[1.2fr_1fr_150px_auto] md:items-end"><label className="block text-xs text-[var(--muted)]">Libellé<input value={field.label} onChange={e => updateLabel(index, e.target.value)} required maxLength={120} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#101116] px-3 py-2 text-sm text-[var(--foreground)]" /></label><label className="block text-xs text-[var(--muted)]">Clé<input value={field.key} onChange={e => updateField(index, { key: e.target.value })} required pattern="[a-zA-Z][a-zA-Z0-9_]{0,49}" title="Commence par une lettre ; lettres, chiffres et underscore uniquement." className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#101116] px-3 py-2 text-sm text-[var(--foreground)]" /></label><label className="block text-xs text-[var(--muted)]">Type<select value={field.type} onChange={e => updateField(index, { type: e.target.value as FieldType })} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#101116] px-3 py-2 text-sm text-[var(--foreground)]">{[["text","Texte"],["textarea","Texte long"],["email","E-mail"],["date","Date"],["number","Nombre"],["checkbox","Case à cocher"]].map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label><div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={field.required} onChange={e => updateField(index, { required: e.target.checked })} />Obligatoire</label><button type="button" onClick={() => removeField(index)} className="text-sm text-red-300">Supprimer</button></div></div>)}
        </section>
        <label className="block text-sm">Texte complet du document<textarea required value={bodyTemplate} onChange={e => setBodyTemplate(e.target.value)} rows={14} maxLength={50000} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3 font-mono text-sm leading-6" /></label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{message}</p>}
        <div className="flex flex-wrap gap-3"><button disabled={loading} className="rounded-xl bg-[#D7B65D] px-5 py-3 font-semibold text-[#17150F] disabled:opacity-60">{loading ? "Enregistrement…" : "Enregistrer le modèle"}</button><button type="button" onClick={() => setShowAdvanced(false)} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm">Annuler</button></div>
      </form>}
    </section>
  </main>;
}
