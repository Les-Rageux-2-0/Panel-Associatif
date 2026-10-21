"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const types = [
  ["PLAYER_VOLUNTEER_ADULT", "Contrat joueur bénévole majeur"],
  ["ROSTER_CONTRACT", "Contrat de roster"],
  ["RECRUITER_CONTRACT", "Contrat de recruteur"],
  ["PLAYER_MINOR", "Contrat joueur mineur"],
  ["PARENTAL_AUTHORIZATION", "Autorisation parentale"],
  ["SUSPENSION_NOTICE", "Notification de mise à pied"],
  ["DONATION_RECEIPT", "Reçu de don"],
  ["ACCOUNTING_LEDGER", "Cahier de tenue des comptes"]
];

type AdminUser = {id:string;name:string;email:string;role:string};
type AdminDoc = { id:string; title:string; reference:string; type:string; status:string; updatedAt:string; pdfOriginalKey:string|null; pdfFinalKey:string|null; createdBy:{name:string}; signers:{id:string;fullName:string;email:string;status:string}[]; recipients:{user:{name:string;email:string}}[] };
const statusNames:Record<string,string>={DRAFT:"Brouillon",IN_REVIEW:"En révision",PENDING_SIGNATURES:"À signer",PARTIALLY_SIGNED:"Partiellement signé",SIGNED:"Signé",REFUSED:"Refusé",EXPIRED:"Expiré",CANCELLED:"Annulé",ARCHIVED:"Archivé"};
export default function AdminDocumentsPage() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(types[0][0]);
  const [file, setFile] = useState<File | null>(null);
  const [recipientUserIds, setRecipientUserIds] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents,setDocuments] = useState<AdminDoc[]>([]);
  const [recipientUsers,setRecipientUsers] = useState<AdminUser[]>([]);
  const [listError,setListError] = useState("");
  const [busyDoc,setBusyDoc] = useState("");
  async function loadDocuments(){try{const r=await fetch("/api/admin/documents",{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"Chargement des documents impossible.");setDocuments(d.documents);setRecipientUsers(d.users??[])}catch(e){setListError(e instanceof Error?e.message:"Chargement impossible.")}}
  useEffect(()=>{void loadDocuments()},[]);
  async function generatePdf(id:string){setBusyDoc(id);setListError("");setMessage("");try{const r=await fetch(`/api/admin/documents/${encodeURIComponent(id)}/pdf`,{method:"POST"});const d=await r.json();if(!r.ok)throw Error(d.error||"Génération PDF impossible.");setMessage(`PDF généré pour ${d.reference??"le document"}.`);await loadDocuments()}catch(e){setListError(e instanceof Error?e.message:"Génération impossible.")}finally{setBusyDoc("")}}

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!file) { setError("Sélectionne un PDF."); return; }
    setLoading(true);
    try {
      const form = new FormData(); form.set("title", title); form.set("type", type); form.set("file", file); form.set("recipientUserIds", recipientUserIds);
      const response = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Envoi impossible.");
      setMessage(`Document enregistré : ${data.document.reference}`);
      setTitle(""); setFile(null); setRecipientUserIds("");
      (event.currentTarget as HTMLFormElement).reset();
      await loadDocuments();
    } catch (e) { setError(e instanceof Error ? e.message : "Envoi impossible."); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <Link href="/tableau-de-bord" className="text-sm text-[var(--muted)]">← Tableau de bord</Link>
    <h1 className="mt-5 text-3xl font-semibold">Gestion des documents</h1>
    <div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/modeles" className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm">Gérer les modèles</Link><Link href="/admin/documents/nouveau" className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#171821]">Créer depuis un modèle</Link><Link href="/admin/signatures" className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm">Gérer les signatures</Link></div>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Réservé aux rôles Manager, Admin et Owner. Le PDF sera envoyé dans le bucket privé R2 puis référencé dans MariaDB. Limite : 10 Mo.</p>
    <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <label className="block text-sm">Titre<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /></label>
      <label className="block text-sm">Type de document<select value={type} onChange={e => setType(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3">{types.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      <fieldset className="rounded-xl border border-[var(--border)] p-4"><legend className="px-2 text-sm">Attribuer aux comptes (facultatif)</legend><div className="max-h-40 space-y-2 overflow-auto">{recipientUsers.map(u=>{const ids=recipientUserIds.split(",").filter(Boolean);return <label key={u.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={ids.includes(u.id)} onChange={e=>setRecipientUserIds(current=>{const currentIds=current.split(",").filter(Boolean);return e.target.checked?[...new Set([...currentIds,u.id])].join(","):currentIds.filter(id=>id!==u.id).join(",")})}/><span className="flex-1">{u.name} <span className="text-xs text-[var(--muted)]">{u.email}</span></span><span className="text-xs text-[#D7B65D]">{u.role}</span></label>})}{recipientUsers.length===0&&<p className="text-xs text-[var(--muted)]">Aucun compte actif disponible.</p>}</div></fieldset>
      <label className="block text-sm">Fichier PDF<input required type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      <button disabled={loading} className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[#171821] disabled:opacity-60">{loading ? "Envoi en cours..." : "Envoyer vers R2"}</button>
    </form>
    <section className="admin-panel mt-6">
      <div className="admin-panel-heading"><div><p className="admin-section-kicker">REGISTRE DOCUMENTAIRE</p><h2>Documents gérés</h2><p>Les 200 documents récemment modifiés. Les originaux et PDF finaux restent dans le stockage privé.</p></div><button className="admin-refresh" onClick={()=>void loadDocuments()}>Actualiser</button></div>
      {listError&&<p className="admin-alert m-4">{listError}</p>}
      {documents.length===0?<div className="admin-empty"><span aria-hidden="true">▤</span><b>Aucun document affiché</b><p>Crée un document depuis un modèle ou importe un PDF.</p></div>:<div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Document</th><th>Statut</th><th>Signataires</th><th>Attribué à</th><th>Mis à jour</th><th>Action</th></tr></thead><tbody>{documents.map(doc=><tr key={doc.id}><td><b>{doc.title}</b><small className="admin-table-sub">{doc.reference} · {doc.type}</small></td><td><span className={`admin-user-status ${doc.status==="SIGNED"?"user-active":doc.status==="DRAFT"?"user-pending":""}`}>{statusNames[doc.status]??doc.status}</span></td><td>{doc.signers.length?`${doc.signers.filter(s=>s.status==="SIGNED").length}/${doc.signers.length} signé(s)`:"Pas de signataire"}</td><td>{doc.recipients.length?doc.recipients.map(r=>r.user.name).join(", "):"Non attribué"}</td><td>{new Date(doc.updatedAt).toLocaleDateString("fr-FR")}</td><td>{doc.status==="DRAFT"&&<button className="admin-row-action-button" disabled={!!busyDoc} onClick={()=>void generatePdf(doc.id)}>{busyDoc===doc.id?"Génération…":"Générer PDF"}</button>}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
