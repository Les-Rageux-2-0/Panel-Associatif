import Link from "next/link";
import Image from "next/image";
import {
  User,
  FileText,
  Users,
  ShieldCheck,
  Wallet,
  ClipboardList,
  Mail,
  CircleCheck,
  Clock3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Module = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  tag: string;
};

type Feature = {
  icon: LucideIcon;
  label: string;
};

const modules: Module[] = [
  {
    icon: FileText,
    title: "Documents",
    description: "Contrats, autorisations et PDF",
    href: "/documents",
    tag: "8 modèles prévus",
  },
  {
    icon: Users,
    title: "Membres & rosters",
    description: "Profils, joueurs et équipes",
    href: "/equipe",
    tag: "Gestion des accès",
  },
  {
    icon: ShieldCheck,
    title: "Signatures",
    description: "Invitations et suivi des signatures",
    href: "/signatures",
    tag: "Code e-mail 72 h",
  },
  {
    icon: Wallet,
    title: "Comptabilité",
    description: "Dons, dépenses et justificatifs",
    href: "/admin/comptabilite",
    tag: "Journal traçable",
  },
  {
    icon: ClipboardList,
    title: "Discipline",
    description: "Notifications et historique",
    href: "/admin/discipline",
    tag: "Accès restreint",
  },
  {
    icon: Mail,
    title: "Notifications",
    description: "E-mails et échéances",
    href: "/admin/parametres",
    tag: "SMTP à configurer",
  },
];

const features: Feature[] = [
  { icon: CircleCheck, label: "Documents versionnés" },
  { icon: Clock3, label: "Suivi des échéances" },
  { icon: ShieldCheck, label: "Accès par rôle" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* En-tête */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Accueil Les Rageux 2.0"
          >
            <Image
              src="/rageux-logo.png"
              alt="Logo Les Rageux 2.0"
              width={48}
              height={48}
              
            />

            <div>
              <div className="font-bold tracking-wide">
                LES RAGEUX{" "}
                <span className="text-[var(--muted)]">2.0</span>
              </div>

              <div className="text-xs text-[var(--muted)]">
                ESPACE DE GESTION
              </div>
            </div>
          </Link>

          <Link
            href="/connexion"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition hover:bg-[var(--surface)]"
          >
            Connexion{" "}
            <User className="ml-1 inline h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Présentation */}
        <div className="mb-10 grid gap-8 lg:grid-cols-[1.4fr_.6fr]">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 md:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
              <span
                className="h-2 w-2 rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              Portail administratif
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
              Tout le suivi de l&apos;équipe, au même endroit.
            </h1>

            <p className="mt-5 max-w-2xl leading-7 text-[var(--muted)]">
              Une plateforme pour centraliser les documents,
              organiser les signatures, gérer les membres et suivre
              les opérations financières des Rageux 2.0.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/connexion"
                className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[#171821] transition hover:opacity-90"
              >
              <User className="ml-2 inline h-4 w-4" />
                Accéder à mon espace{" "}
                
              </Link>

              <Link
                href="/inscription"
                className="rounded-xl border border-[var(--border)] px-5 py-3 transition hover:bg-[var(--surface-raised)]"
              >
                Créer un compte
              </Link>

              <Link
                href="/documents"
                className="rounded-xl border border-[var(--border)] px-5 py-3 transition hover:bg-[var(--surface-raised)]"
              >
                Découvrir les documents
              </Link>
            </div>
          </section>

          {/* Informations et fonctionnalités */}
          <section className="flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-[var(--surface-raised)] p-7">
            <div>
              <div className="text-sm text-[var(--muted)]">
                Espace centralisé
              </div>

              <h2 className="mt-3 text-2xl font-semibold">
                Clair. Traçable. Sécurisé.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Chaque action sensible doit être contrôlée côté serveur
                et enregistrée dans le journal d&apos;audit.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {features.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 text-sm"
                >
                  <Icon
                    className="h-5 w-5 text-[var(--muted)]"
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>



        {/* Avertissement de configuration */}
        <p className="mt-10 text-xs leading-5 text-[var(--muted)]">

        </p>
      </div>

      {/* Pied de page */}
      <footer className="mt-8 border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Les Rageux 2.0. Tous droits
            réservés.
          </p>

          <nav
            aria-label="Liens légaux"
            className="flex flex-wrap gap-4"
          >
            <Link
              href="/cgu"
              className="transition hover:opacity-75"
            >
              Conditions générales d'utilisation
            </Link>

            <Link
              href="/confidentialite"
              className="transition hover:opacity-75"
            >
              Confidentialité
            </Link>

            <Link
              href="/mentions-legales"
              className="transition hover:opacity-75"
            >
              Mentions légales
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
