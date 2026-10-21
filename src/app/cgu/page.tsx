
import LegalPage from "../legal/LegalPage";

export default function CGUPage() {
  return (
    <LegalPage
      title="Conditions générales d’utilisation"
      subtitle="Les règles d’accès et d’utilisation du portail administratif et e-sportif."
      sections={[
        {
          title: "Objet",
          paragraphs: [
            "Les présentes CGU définissent les règles d’utilisation du portail Les Rageux 2.0 : comptes, membres, équipes, documents, signatures et rattachements parent-joueur.",
          ],
        },
        {
          title: "Accès au service",
          paragraphs: [
            "Certaines fonctionnalités nécessitent un compte authentifié. Les accès dépendent du rôle, du statut du compte et des permissions attribuées.",
          ],
        },
        {
          title: "Comptes utilisateurs",
          paragraphs: [
            "L’utilisateur s’engage à fournir des informations exactes, à protéger ses identifiants et à signaler toute utilisation non autorisée de son compte.",
            "La création d’un compte ne garantit pas automatiquement l’adhésion à l’association ou l’accès à toutes les fonctionnalités.",
          ],
        },
        {
          title: "Rôles et permissions",
          paragraphs: [
            "Les rôles OWNER, ADMIN, MANAGER, RECRUITER, MEMBER, PARENT et ACCOUNTANT disposent uniquement des autorisations qui leur sont attribuées.",
            "Il est interdit de contourner les contrôles d’accès ou de tenter d’obtenir des privilèges non autorisés.",
          ],
        },
        {
          title: "Rattachement parent-joueur",
          paragraphs: [
            "Un parent peut soumettre une demande de rattachement à un compte joueur. La demande demeure en attente jusqu’à sa décision.",
            "Seuls les rôles OWNER et ADMIN sont autorisés à approuver ou refuser une demande. Le rattachement approuvé ne donne accès qu’aux données et documents autorisés.",
          ],
        },
        {
          title: "Documents et PDF",
          paragraphs: [
            "Le portail permet de préparer des documents à partir de modèles, de renseigner les champs nécessaires, de générer des PDF et de conserver les documents selon les permissions applicables.",
            "L’utilisateur doit vérifier les informations saisies. La validité d’un document dépend de son contenu, des signataires et des formalités éventuellement requises.",
          ],
        },
        {
          title: "Signature électronique",
          paragraphs: [
            "Le signataire doit lire le document avant de confirmer sa signature. Il ne doit pas utiliser le lien ou le code de vérification d’une autre personne.",
            "La valeur juridique d’une signature dépend du procédé utilisé et des règles applicables. Le portail ne prétend pas qu’une signature simple constitue automatiquement une signature qualifiée.",
          ],
        },
        {
          title: "Comportement interdit",
          paragraphs: [
            "Sont notamment interdits l’usurpation d’identité, l’accès non autorisé à des comptes, le harcèlement, les tentatives de compromission du service et la diffusion non autorisée de documents confidentiels.",
          ],
        },
        {
          title: "Mineurs",
          paragraphs: [
            "Les fonctionnalités utilisées par des mineurs doivent respecter leurs droits et les règles applicables. Le rattachement parental ne confère pas un accès illimité aux données du joueur.",
          ],
        },
        {
          title: "Suspension et sécurité",
          paragraphs: [
            "En cas de risque de sécurité ou de violation des CGU, l’accès peut être temporairement limité dans la mesure nécessaire. Les mesures disciplinaires associatives restent soumises aux statuts, au règlement intérieur et aux règles applicables.",
          ],
        },
        {
          title: "Données personnelles",
          paragraphs: [
            "Les traitements de données sont décrits dans la Politique de confidentialité. Les demandes peuvent être adressées à rageux014@gmail.com.",
          ],
        },
        {
          title: "Modifications",
          paragraphs: [
            "Les CGU peuvent être mises à jour. Les utilisateurs sont informés des modifications importantes lorsque cela est nécessaire.",
          ],
        },
        {
          title: "Droit applicable et contact",
          paragraphs: [
            "Les CGU sont soumises au droit français, sous réserve des règles impératives applicables. Les parties peuvent rechercher une solution amiable, sans préjudice des règles légales de compétence.",
            "Contact : rageux014@gmail.com. Adresse : [A Définir].",
          ],
        },
      ]}
    />
  );
}
