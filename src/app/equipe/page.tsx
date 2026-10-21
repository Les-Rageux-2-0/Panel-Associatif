import Link from "next/link";

export default function TeamPage() {
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <Link href="/" className="text-sm text-[var(--muted)]">← Accueil</Link>
    <h1 className="mt-5 text-3xl font-semibold">Membres & rosters</h1>
    <p className="mt-3 leading-7 text-[var(--muted)]">Le schéma permet de gérer les comptes, les informations de profil et les rosters compétitifs. Les écrans CRUD seront activés après la mise en place des sessions et des permissions.</p>
  </main>;
}
