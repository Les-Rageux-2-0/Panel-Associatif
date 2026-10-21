import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Bell,
  BookOpenCheck, CalendarDays, ChartNoAxesCombined, CheckCircle2, ChevronRight,
  CircleDollarSign, ClipboardList, FileCheck2, FileClock, FilePlus2, FileText,
  LayoutDashboard, LogOut, Settings2, ShieldCheck, Users, WalletCards,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const adminRoles = ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT"];
const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon", IN_REVIEW: "À vérifier", PENDING_SIGNATURES: "À signer",
  PARTIALLY_SIGNED: "Signatures en cours", SIGNED: "Signé", REFUSED: "Refusé",
  EXPIRED: "Expiré", CANCELLED: "Annulé", ARCHIVED: "Archivé",
};
const typeLabels: Record<string, string> = {
  PLAYER_VOLUNTEER_ADULT: "Contrat joueur bénévole", PLAYER_MINOR: "Contrat joueur mineur",
  PARENTAL_AUTHORIZATION: "Autorisation parentale", ROSTER_CONTRACT: "Convention de roster",
  RECRUITER_CONTRACT: "Convention de recrutement", SUSPENSION_NOTICE: "Notification disciplinaire",
  DONATION_RECEIPT: "Attestation de don", ACCOUNTING_LEDGER: "Fiche comptable",
};
function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const isAdmin = adminRoles.includes(user.role);
  const where = isAdmin ? {} : {
    OR: [
      { createdById: user.id },
      { recipients: { some: { userId: user.id } } },
      { signers: { some: { OR: [{ userId: user.id }, { email: user.email }] } } },
    ],
  };
  const [documents, documentCount, drafts, waitingSignatures, signedCount, membersCount, templateCount, pendingUsers] = await Promise.all([
    prisma.document.findMany({ where, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true, reference: true, status: true, updatedAt: true, type: true } }),
    prisma.document.count({ where }),
    prisma.document.count({ where: { ...where, status: "DRAFT" } }),
    prisma.document.count({ where: { ...where, status: { in: ["PENDING_SIGNATURES", "PARTIALLY_SIGNED"] } } }),
    prisma.document.count({ where: { ...where, status: "SIGNED" } }),
    isAdmin ? prisma.user.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
    isAdmin ? prisma.documentTemplate.count({ where: { isActive: true } }) : Promise.resolve(0),
    isAdmin ? prisma.user.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
  ]);

  const nav = [
    { label: "Vue d’ensemble", href: "/tableau-de-bord", icon: LayoutDashboard, active: true },
    { label: "Documents", href: isAdmin ? "/admin/documents" : "/documents", icon: FileText },
    ...(isAdmin ? [
      { label: "Modèles", href: "/admin/modeles", icon: BookOpenCheck },
      { label: "Signatures", href: "/admin/signatures", icon: FileCheck2 },
      { label: "Comptabilité", href: "/admin/comptabilite", icon: WalletCards },
      { label: "Discipline", href: "/admin/discipline", icon: ShieldCheck },
      { label: "Paramètres", href: "/admin/parametres", icon: Settings2 },
    ] : []),
    ...(user.role === "PARENT" ? [{ label: "Espace parent", href: "/espace-parent", icon: Users }] : []),
    { label: "Équipe", href: "/equipe", icon: Users },
  ];

  return <div className="dashboard-shell">
    <aside className="dashboard-sidebar">
      <Link href="/" className="brand-lockup">
        <div className="brand-mark"><Image src="/rageux-logo.png" alt="" width={48} height={48} priority /></div>
        <div className="brand-copy"><strong>LES RAGEUX <span>2.0</span></strong><small>PORTAIL DE GESTION</small></div>
      </Link>
      <div className="sidebar-label">ESPACE DE TRAVAIL</div>
      <nav className="sidebar-nav" aria-label="Navigation principale">
        {nav.map((item) => <Link key={item.href} href={item.href} className={`sidebar-link ${item.active ? "is-active" : ""}`}>
          <item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.active && <span className="nav-active-dot" />}
        </Link>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-security"><div className="security-icon"><ShieldCheck size={18} /></div><div><strong>Espace sécurisé</strong><p>Accès selon votre rôle</p></div><span className="online-dot" /></div>
      <div className="sidebar-profile"><div className="profile-avatar">{initials(user.name)}</div><div className="profile-meta"><strong>{user.name}</strong><span>{user.role}</span></div><form action="/api/auth/logout" method="post"><button className="icon-button" aria-label="Déconnexion" title="Déconnexion"><LogOut size={17} /></button></form></div>
    </aside>

    <main className="dashboard-main">
      <header className="dashboard-topbar"><div className="breadcrumb"><span>Les Rageux 2.0</span><ChevronRight size={14} /><strong>Vue d’ensemble</strong></div><div className="topbar-actions"><span className="live-indicator"><span /> Système opérationnel</span><div className="topbar-avatar">{initials(user.name)}</div></div></header>
      <div className="dashboard-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> ESPACE ADMINISTRATIF</div><h1>Bonjour, {user.name.split(" ")[0]} <span className="wave">✦</span></h1><p>Voici le résumé de votre espace de gestion aujourd’hui.</p></div><div className="welcome-date"><CalendarDays size={16} /> {dateLabel(new Date())}</div></section>

        {isAdmin && pendingUsers > 0 && <Link href="/admin/parametres" className="notice-banner"><div className="notice-icon"><Bell size={18} /></div><div><strong>{pendingUsers} compte{pendingUsers > 1 ? "s" : ""} en attente</strong><p>Des comptes nécessitent peut-être une vérification administrative.</p></div><ArrowRight size={18} className="notice-arrow" /></Link>}

        <section className="metric-grid" aria-label="Indicateurs clés">
          <article className="metric-card"><div className="metric-top"><span className="metric-icon gold"><FileText size={19} /></span><span className="metric-context">Tous statuts</span></div><p className="metric-label">Documents accessibles</p><div className="metric-bottom"><strong>{documentCount}</strong><span className="metric-foot">Dans votre espace</span></div><div className="metric-accent" /></article>
          <article className="metric-card"><div className="metric-top"><span className="metric-icon amber"><FileClock size={19} /></span><span className="metric-context">Action requise</span></div><p className="metric-label">Signatures en attente</p><div className="metric-bottom"><strong>{waitingSignatures}</strong><span className="metric-foot">À suivre</span></div><div className="metric-accent accent-amber" /></article>
          <article className="metric-card"><div className="metric-top"><span className="metric-icon green"><BadgeCheck size={19} /></span><span className="metric-context">Finalisés</span></div><p className="metric-label">Documents signés</p><div className="metric-bottom"><strong>{signedCount}</strong><span className="metric-foot">Archivés dans le portail</span></div><div className="metric-accent accent-green" /></article>
          <article className="metric-card"><div className="metric-top"><span className="metric-icon blue"><ClipboardList size={19} /></span><span className="metric-context">À compléter</span></div><p className="metric-label">Brouillons</p><div className="metric-bottom"><strong>{drafts}</strong><span className="metric-foot">Non envoyés</span></div><div className="metric-accent accent-blue" /></article>
        </section>

        <div className="dashboard-columns">
          <section className="panel-card documents-panel"><div className="panel-heading"><div><div className="section-kicker">SUIVI ADMINISTRATIF</div><h2>Documents récents</h2><p>Les dernières activités de vos documents.</p></div><Link href={isAdmin ? "/admin/documents" : "/documents"} className="text-link">Voir tous <ArrowRight size={15} /></Link></div>
            {documents.length === 0 ? <div className="empty-state"><div className="empty-icon"><FileText size={24} /></div><strong>Aucun document pour le moment</strong><p>Les documents auxquels vous avez accès apparaîtront ici.</p>{isAdmin && <Link className="gold-button" href="/admin/documents/nouveau"><FilePlus2 size={16} /> Créer un document</Link>}</div> : <div className="document-list">{documents.map((doc) => <div className="document-row" key={doc.id}><div className="document-icon"><FileText size={19} /></div><div className="document-main-info"><Link href={isAdmin ? "/admin/documents" : "/documents"} className="document-title">{doc.title}</Link><div className="document-meta"><span>{doc.reference}</span><span className="meta-separator">•</span><span>{typeLabels[doc.type] ?? doc.type}</span></div></div><div className={`status-pill status-${doc.status.toLowerCase()}`}><span />{statusLabels[doc.status] ?? doc.status}</div><div className="document-date">{dateLabel(doc.updatedAt)}</div><Link href={`/api/documents/${doc.id}/download`} className="row-action" aria-label={`Télécharger ${doc.title}`} title="Télécharger le PDF"><ArrowDownRight size={17} /></Link></div>)}</div>}
          </section>

          <aside className="dashboard-side-stack">
            <section className="quick-panel"><div className="section-kicker">ACCÈS RAPIDE</div><h2>Que souhaitez-vous faire ?</h2><div className="quick-links">
              {isAdmin && <Link href="/admin/documents/nouveau" className="quick-link"><span className="quick-link-icon"><FilePlus2 size={18} /></span><span><strong>Créer un document</strong><small>À partir d’un modèle existant</small></span><ChevronRight size={17} /></Link>}
              <Link href={isAdmin ? "/admin/documents" : "/documents"} className="quick-link"><span className="quick-link-icon"><ClipboardList size={18} /></span><span><strong>Gérer les documents</strong><small>Consulter et suivre les dossiers</small></span><ChevronRight size={17} /></Link>
              {isAdmin && <Link href="/admin/signatures" className="quick-link"><span className="quick-link-icon"><FileCheck2 size={18} /></span><span><strong>Suivre les signatures</strong><small>Invitations et statuts de signature</small></span><ChevronRight size={17} /></Link>}
              {isAdmin && <Link href="/admin/modeles" className="quick-link"><span className="quick-link-icon"><BookOpenCheck size={18} /></span><span><strong>Bibliothèque de modèles</strong><small>{templateCount} modèle{templateCount > 1 ? "s" : ""} actif{templateCount > 1 ? "s" : ""}</small></span><ChevronRight size={17} /></Link>}
              {user.role === "PARENT" && <Link href="/espace-parent" className="quick-link"><span className="quick-link-icon"><Users size={18} /></span><span><strong>Gérer l’espace parent</strong><small>Rattacher un compte joueur</small></span><ChevronRight size={17} /></Link>}
            </div></section>
            {isAdmin && <section className="workspace-card"><div className="workspace-card-head"><span className="workspace-emblem"><ChartNoAxesCombined size={20} /></span><span className="workspace-badge"><Activity size={12} /> ACTIF</span></div><h3>Votre espace de gestion</h3><p>Centralisez les contrats, les signatures et le suivi administratif depuis un seul endroit.</p><div className="workspace-stats"><div><strong>{membersCount}</strong><span>Membres actifs</span></div><div><strong>{templateCount}</strong><span>Modèles actifs</span></div></div><Link href="/admin/parametres" className="workspace-link">Paramètres de l’espace <ArrowRight size={15} /></Link></section>}
          </aside>
        </div>
        <footer className="dashboard-footer"><span>© {new Date().getFullYear()} Les Rageux 2.0</span><span><ShieldCheck size={13} /> Portail administratif sécurisé</span><span>Accès confidentiel</span></footer>
      </div>
    </main>
  </div>;
}
