
import LegalPage from "../legal/LegalPage";

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      title="Mentions légales"
      subtitle="Informations relatives à l’éditeur, à la publication et à l’hébergement du portail Les Rageux 2.0."
      sections={[
        {
          title: "Éditeur du site",
          paragraphs: [
            "Nom : Les Rageux 2.0.",
            "Statut juridique : association loi du 1er juillet 1901, à confirmer selon la déclaration effective de l’association.",
            "Représentant : Emerick CARRÉE, ",
            "Adresse du siège : [A Définir].",
            "E-mail : rageux014@gmail.com.",
            "RNA : [A Définir].",
            "SIREN/SIRET : [A Définir].",
          ],
        },
        {
          title: "Directeur de publication",
          paragraphs: [
            "Le directeur de publication est : Emerick CARRÉE.",
          ],
        },
        {
          title: "Hébergement",
          paragraphs: [
            "Application web : Vercel.",
            "Base de données : Neuroshost.",
            "Stockage des documents : CloudFare.",
          ],
        },
        {
          title: "Objet du portail",
          paragraphs: [
            "Le portail permet la gestion des comptes, des membres, des équipes, des documents administratifs, des signatures, des rattachements parent-joueur et du suivi associatif.",
          ],
        },
        {
          title: "Propriété intellectuelle",
          paragraphs: [
            "Les éléments originaux appartenant à Les Rageux 2.0 sont protégés par les règles de propriété intellectuelle applicables. Les contenus de tiers demeurent la propriété de leurs titulaires.",
          ],
        },
        {
          title: "Responsabilité",
          paragraphs: [
            "Les Rageux 2.0 s’efforce de maintenir un service accessible et sécurisé sans pouvoir garantir l’absence totale d’interruption ou d’erreur.",
          ],
        },
        {
          title: "Données personnelles",
          paragraphs: [
            "Les modalités de traitement des données personnelles sont décrites dans la Politique de confidentialité accessible depuis le portail.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "Pour toute question relative au site : rageux014@gmail.com.",
          ],
        },
      ]}
    />
  );
}
