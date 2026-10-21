import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { readEmailVerificationToken } from "@/lib/security/email-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };
export default async function EmailVerificationPage({ searchParams }: Props) {
  const { token } = await searchParams;
  let state: "success" | "already" | "invalid" | "error" = "invalid";
  if (token) {
    const payload = readEmailVerificationToken(token);
    if (payload) {
      try {
        const user = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true, emailVerifiedAt: true } });
        if (user?.emailVerifiedAt) state = "already";
        else if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
          state = "success";
        }
      } catch { state = "error"; }
    }
  }
  const content = {
    success: { title: "Adresse confirmée", message: "Votre adresse e-mail est maintenant vérifiée. Pour protéger l'équipe, votre compte doit encore être activé par un administrateur avant votre première connexion." },
    already: { title: "Adresse déjà confirmée", message: "Cette adresse e-mail a déjà été confirmée. Si votre compte n'est pas encore accessible, il est probablement en attente d'activation par un administrateur." },
    invalid: { title: "Lien invalide ou expiré", message: "Ce lien de validation est invalide ou a expiré. Recommencez l'inscription ou contactez un administrateur pour obtenir de l'aide." },
    error: { title: "Validation momentanément indisponible", message: "Nous n'avons pas pu valider votre adresse pour le moment. Réessayez dans quelques instants." }
  }[state];
  return <main className="auth-shell flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
    <section className="panel-card w-full max-w-lg rounded-3xl p-7 text-center sm:p-10">
      <Link href="/" className="mx-auto mb-5 block w-36 sm:w-44"><Image src="/brand/les-rageux-2-logo.png" alt="Logo Les Rageux 2.0" width={1024} height={1024} priority className="h-auto w-full drop-shadow-[0_0_22px_rgba(229,173,53,.16)]" /></Link>
      <p className="text-xs font-bold tracking-[.3em] text-[var(--accent)]">LES RAGEUX 2.0</p>
      <div className={`mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${state === "success" || state === "already" ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-[var(--border)] bg-black/30 text-[var(--muted)]"}`}><span className="text-2xl">{state === "success" || state === "already" ? "✓" : "!"}</span></div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{content.title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">{content.message}</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2"><Link href="/connexion" className="gold-button rounded-xl px-5 py-3 text-sm font-bold">Aller à la connexion</Link><Link href="/" className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold hover:bg-white/5">Retour à l'accueil</Link></div>
    </section>
  </main>;
}
