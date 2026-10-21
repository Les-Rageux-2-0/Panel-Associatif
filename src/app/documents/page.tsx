import Link from "next/link";

const documents = [
  ["PLAYER_VOLUNTEER_ADULT", "Contrat joueur bénévole majeur"],
  ["ROSTER_CONTRACT", "Contrat de roster"],
  ["RECRUITER_CONTRACT", "Contrat de recruteur"],
  ["PLAYER_MINOR", "Contrat joueur mineur"],
  ["PARENTAL_AUTHORIZATION", "Autorisation parentale"],
  ["SUSPENSION_NOTICE", "Notification de mise à pied"],
  ["DONATION_RECEIPT", "Reçu de don"],
  ["ACCOUNTING_LEDGER", "Cahier de tenue des comptes"]
];

export default function DocumentsPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <Link href="/" className="text-sm text-[var(--muted)]">← Accueil</Link>
    <h1 className="mt-5 text-3xl font-semibold">Bibliothèque de documents</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Les huit catégories prévues pour l'application. Les modèles juridiques doivent être validés avant usage réel.</p>
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {documents.map(([key, label], i) => <div key={key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="text-xs text-[var(--muted)]">MODÈLE {String(i + 1).padStart(2, "0")}</div>
        <h2 className="mt-2 font-semibold">{label}</h2>
        <div className="mt-4 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">À configurer</div>
      </div>)}
    </div>
  </main>;
}
