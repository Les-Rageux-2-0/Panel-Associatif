
import LegalPage from "../legal/LegalPage";

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      subtitle="Comment Les Rageux 2.0 traite et protège les données personnelles."
      sections={[
        {
          title: "Responsable du traitement",
          paragraphs: [
            "Responsable : Les Rageux 2.0, sous réserve de confirmation de la structure juridiquement responsable.",
            "Adresse : [A Définir].",
            "Contact : rageux014@gmail.com.",
            "Délégué à la protection des données : [A Définir].",
          ],
        },
        {
          title: "Données collectées",
          paragraphs: [
            "Selon les fonctionnalités utilisées, le portail peut traiter le nom, le prénom, l’adresse e-mail, le pseudonyme, les informations de compte, les rôles, les équipes et les données nécessaires à la gestion des membres.",
            "Les documents peuvent contenir des informations personnelles, les coordonnées des signataires, les dates de signature et des preuves techniques.",
            "Des données comptables, des justificatifs et des journaux techniques peuvent également être traités lorsqu’ils sont nécessaires.",
          ],
        },
        {
          title: "Finalités",
          paragraphs: [
            "Les données servent à gérer les comptes, les membres, les équipes, les documents, les signatures, les rattachements parent-joueur, la comptabilité et la sécurité du portail.",
            "Chaque traitement doit reposer sur une base légale appropriée : contrat, obligation légale, intérêt légitime ou consentement lorsque celui-ci est réellement la base adaptée.",
          ],
        },
        {
          title: "Données des mineurs",
          paragraphs: [
            "Les données relatives aux joueurs mineurs sont limitées à ce qui est nécessaire à la gestion de leur participation et de leurs autorisations.",
            "Seuls les rôles OWNER et ADMIN peuvent approuver ou refuser les demandes de rattachement parent-joueur. Un rattachement approuvé ne donne accès qu’aux informations autorisées.",
          ],
        },
        {
          title: "Destinataires",
          paragraphs: [
            "Les données peuvent être consultées par les responsables habilités, les signataires concernés et les prestataires techniques nécessaires au fonctionnement du service, dans la limite de leurs missions.",
            "Les données peuvent être communiquées aux autorités compétentes lorsque la loi l’exige.",
          ],
        },
        {
          title: "Hébergement et transferts",
          paragraphs: [
            "Application : Vercel.",
            "Base de données : Neuroshost.",
            "Stockage des documents : CloudFare.",
            "Envoi des e-mails : Gmail.",
            "Les éventuels transferts hors de l’Espace économique européen doivent être identifiés et encadrés conformément au RGPD.",
          ],
        },
        {
          title: "Durées de conservation",
          paragraphs: [
            "Les données sont conservées pendant une durée limitée, adaptée à leur finalité et aux obligations applicables.",
            "Comptes : durée d’activité et période d’inactivité définie par le responsable du traitement.",
            "Documents signés et données comptables : durée définie selon les obligations légales et les besoins de preuve applicables.",
            "Demandes de rattachement et journaux de sécurité : durée nécessaire à la gestion, à la sécurité et aux éventuelles contestations.",
            "Les durées exactes doivent être définies et appliquées avant la mise en production.",
          ],
        },
        {
          title: "Sécurité",
          paragraphs: [
            "Des mesures adaptées aux risques sont mises en œuvre, notamment les contrôles d’accès, la protection des sessions, la limitation des habilitations et la journalisation des actions pertinentes.",
            "Aucun service informatique ne peut garantir une sécurité absolue.",
          ],
        },
        {
          title: "Droits des personnes",
          paragraphs: [
            "Selon les conditions prévues par la réglementation, les personnes peuvent demander l’accès, la rectification, l’effacement ou la limitation de leurs données, s’opposer à certains traitements et demander la portabilité lorsque ce droit s’applique.",
            "Lorsqu’un traitement repose sur le consentement, celui-ci peut être retiré pour l’avenir. Certains documents peuvent toutefois devoir être conservés en application d’une obligation légale ou d’un motif juridique valable.",
          ],
        },
        {
          title: "Exercer ses droits",
          paragraphs: [
            "Les demandes peuvent être adressées à rageux014@gmail.com avec l’objet « Demande relative à mes données personnelles ».",
            "Une vérification proportionnée de l’identité peut être demandée si elle est nécessaire. Les demandes sont traitées dans les délais prévus par la réglementation.",
            "Une réclamation peut être déposée auprès de la CNIL.",
          ],
        },
        {
          title: "Cookies et traceurs",
          paragraphs: [
            "Des cookies strictement nécessaires peuvent être utilisés pour l’authentification, la sécurité et le fonctionnement du service.",
            "Les traceurs non nécessaires soumis au consentement ne doivent être déposés qu’après le recueil du consentement requis. L’inventaire des cookies réellement utilisés doit être ajouté avant publication.",
          ],
        },
        {
          title: "Mises à jour et contact",
          paragraphs: [
            "Cette politique peut être mise à jour en fonction des fonctionnalités, des prestataires et de la réglementation.",
            "Contact : Les Rageux 2.0 — rageux014@gmail.com — [A Définir].",
          ],
        },
      ]}
    />
  );
}
