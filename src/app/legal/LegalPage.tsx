
import Link from "next/link";
import "./legal.css";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalPageProps = {
  title: string;
  subtitle: string;
  updatedAt?: string;
  sections: LegalSection[];
};

export default function LegalPage({
  title,
  subtitle,
  updatedAt = "21 octobre 2026",
  sections,
}: LegalPageProps) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-brand">
          <span className="legal-brand-mark">LR</span>
          <span>
            <strong>LES RAGEUX 2.0</strong>
            <small>PORTAIL OFFICIEL</small>
          </span>
        </Link>

        <nav className="legal-nav" aria-label="Pages légales">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgu">CGU</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </nav>
      </header>

      <section className="legal-hero">
        <span className="legal-eyebrow">INFORMATIONS OFFICIELLES</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <span className="legal-date">
          Dernière mise à jour : {updatedAt}
        </span>
      </section>

      <div className="legal-layout">
        <aside className="legal-sidebar">
          <span>CONTENU DE LA PAGE</span>
          <nav aria-label="Sommaire">
            {sections.map((section, index) => (
              <a
                key={section.title}
                href={`#section-${index + 1}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="legal-content">
          {sections.map((section, index) => (
            <section
              id={`section-${index + 1}`}
              className="legal-section"
              key={section.title}
            >
              <h2>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>

              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </section>
          ))}

          <div className="legal-contact">
            <span className="legal-eyebrow">UNE QUESTION ?</span>
            <h2>Contacte Les Rageux 2.0</h2>
            <p>
              Pour toute question concernant ces informations,
              contacte notre équipe administrative.
            </p>
            <a href="mailto:rageux014@gmail.com">
              rageux014@gmail.com
            </a>
          </div>
        </article>
      </div>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} Les Rageux 2.0</span>
        <div>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgu">CGU</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </div>
      </footer>
    </main>
  );
}
