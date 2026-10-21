"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Connexion impossible.");
      }

      router.push("/tableau-de-bord");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connexion impossible."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-[var(--muted)]"
      >
        ← Retour à l&apos;accueil
      </Link>

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

        {/* Identité */}
        <p className="text-center text-3xl font-semibold text-[#D4AF37]">
          LES RAGEUX 2.0
        </p>

        <h1 className="mt-2 text-center text-2xl font-semibold text-white">
          Connexion
        </h1>

        <p className="mt-3 text-center text-xl leading-6 text-white">
          Connectez-vous à votre espace personnel.
        </p>

        {/* Formulaire de connexion */}
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm text-white">
            Adresse e-mail

            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@lesrageux.com"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
            />
          </label>

          <label className="block text-sm text-white">
            Mot de passe

            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#101116] px-4 py-3 text-white outline-none focus:border-[#D4AF37]"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-lg font-bold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Information sur l'activation des comptes */}
        <p className="mt-5 text-xs leading-5">
          <span className="text-red-400">
            Les comptes créés par inscription restent en attente jusqu&apos;à
            leur activation par un administrateur.
          </span>
        </p>
      </div>
    </main>
  );
}