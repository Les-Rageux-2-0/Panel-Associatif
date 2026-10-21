"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Inscription impossible.");
      setMessage(data.message);
      setName(""); setEmail(""); setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Inscription impossible."); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
    <Link href="/" className="mb-8 text-sm text-[var(--muted)]">← Retour à l'accueil</Link>
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
            {/* Logo centré */}
            <div className="mb-6 flex justify-center">
              <Image
                src="/rageux-logo.png"
                alt="Logo Les Rageux 2.0"
                width={160}
                height={160}
                priority
                className="h-32 w-32 rounded-full object-contain"
              />
    </div>
      <h1 className="text-center text-3xl font-semibold text-[#D4AF37]">Créer un compte</h1>
      <p className="mt-2 text-center text-l font-semibold text-red-400">Les inscriptions publiques créent uniquement des comptes membres en attente d'activation.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm">Nom complet<input required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /></label>
        <label className="block text-sm">Adresse e-mail<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /><span className="text-red-400">*</span><span className="text-white"> <b>Merci d'entrer une adresse e-mail valide</b></span></label>
        <label className="block text-sm">Mot de passe (12 caractères minimum)<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3" /><span className="text-red-400">* </span><span className="text-white"><b>12 caractères minimum</b></span></label>
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
        {message && <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{message}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[#171821] disabled:opacity-60">{loading ? "Création..." : "Créer mon compte"}</button>
      </form>
    </div>
  </main>;
}
