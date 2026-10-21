import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Les Rageux 2.0 — Espace de gestion",
  description: "Gestion administrative, contrats, signatures et comptabilité des Rageux 2.0.",
  icons: { icon: "/rageux-logo.png", shortcut: "/rageux-logo.png", apple: "/rageux-logo.png" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
