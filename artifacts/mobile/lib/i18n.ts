export type Locale = "fr" | "en";

const messages = {
  fr: {
    privacy: {
      title: "Confidentialité",
      updated: "Dernière mise à jour : août 2026",
      controllerTitle: "1. Responsable du traitement",
      controller: "WapiGarage SAS est responsable du traitement des données personnelles collectées via l'application mobile WapiGarage. Contact : support@wapigarage.cg.",
      collectedTitle: "2. Données collectées",
      collected: "Nous collectons les données nécessaires au fonctionnement du service : prénom, nom, adresse e-mail et photo de profil fournis par Google ; numéro de téléphone s'il est renseigné ; garages consultés, conversations, factures, paiements, avis et photos envoyées ; ainsi que les données techniques nécessaires à la sécurité, comme l'identifiant de session et les journaux d'erreur. La localisation n'est pas collectée sans autorisation explicite.",
      purposesTitle: "3. Finalités",
      purposes: "Ces données servent à créer et sécuriser votre compte, vous mettre en relation avec les garages, créer et suivre les factures, transmettre les informations nécessaires au paiement à KPay, afficher les conversations et avis vérifiés, traiter les photos, prévenir les abus et envoyer des notifications lorsque vous les avez autorisées.",
      legalTitle: "4. Bases du traitement",
      legal: "Le traitement repose sur l'exécution du service demandé, votre consentement pour les fonctionnalités facultatives et notre intérêt légitime pour la sécurité, la prévention de la fraude et l'amélioration du service.",
      sharingTitle: "5. Partage des données",
      sharing: "Vos données ne sont pas vendues. Elles peuvent être transmises au garage concerné pour permettre le rendez-vous ou la conversation, à KPay et à ses prestataires pour traiter le paiement, à nos prestataires d'hébergement et de stockage, ou aux autorités lorsque la loi l'impose.",
      paymentTitle: "6. Paiements",
      payment: "WapiGarage utilise une facture serveur comme source du montant à payer. L'application conserve les informations nécessaires au suivi de la transaction, notamment l'identifiant de facture, le montant, la devise, le statut et l'identifiant de transaction. Les informations de paiement sensibles restent traitées par le prestataire de paiement selon ses propres règles.",
      imagesTitle: "7. Photos et fichiers",
      images: "Les photos envoyées servent à afficher le profil, le garage ou les éléments nécessaires au service. Elles sont stockées dans l'infrastructure prévue par l'application et peuvent être supprimées avec le compte ou sur demande, sous réserve des obligations légales et de sécurité.",
      retentionTitle: "8. Conservation",
      retention: "Les données du compte sont conservées pendant l'utilisation du service. Après une demande de suppression, les données personnelles sont supprimées ou anonymisées dans un délai opérationnel pouvant aller jusqu'à 30 jours, sauf obligation légale, prévention de fraude ou nécessité de preuve. Les journaux de sécurité peuvent être conservés jusqu'à 12 mois.",
      rightsTitle: "9. Vos droits",
      rights: "Vous pouvez demander l'accès, la rectification, la suppression, la limitation, l'opposition ou la portabilité de vos données lorsque ces droits sont applicables. Contactez support@wapigarage.cg. La suppression du compte est disponible depuis l'application et entraîne la suppression des données personnelles selon les règles de conservation ci-dessus.",
      securityTitle: "10. Sécurité",
      security: "Les communications utilisent HTTPS lorsque disponible. Les sessions mobiles sont stockées dans SecureStore et les accès aux ressources privées sont contrôlés côté serveur. Aucun système connecté à Internet ne peut toutefois garantir un risque nul.",
      changesTitle: "11. Modifications",
      changes: "Cette politique peut être mise à jour pour refléter une évolution du service ou de la réglementation. En cas de changement important, une information sera affichée dans l'application. La date de mise à jour est indiquée en haut de cette page.",
    },
  },
  en: {
    privacy: {
      title: "Privacy",
      updated: "Last updated: August 2026",
      controllerTitle: "1. Data controller",
      controller: "WapiGarage SAS is responsible for personal data collected through the WapiGarage mobile application. Contact: support@wapigarage.cg.",
      collectedTitle: "2. Data we collect",
      collected: "We collect data needed to operate the service: name, email address and Google profile photo; an optional phone number; garages viewed, conversations, invoices, payments, reviews and uploaded photos; and technical data required for security, such as session identifiers and error logs. Location is not collected without explicit permission.",
      purposesTitle: "3. Purposes",
      purposes: "Data is used to create and secure your account, connect you with garages, create and track invoices, send required payment information to KPay, display conversations and verified reviews, process photos, prevent abuse and send notifications when authorized.",
      legalTitle: "4. Legal bases",
      legal: "Processing is based on providing the requested service, your consent for optional features and our legitimate interests in security, fraud prevention and service improvement.",
      sharingTitle: "5. Sharing",
      sharing: "We do not sell your data. It may be shared with the relevant garage, KPay and its payment providers, hosting and storage providers, or authorities where legally required.",
      paymentTitle: "6. Payments",
      payment: "WapiGarage uses a server-side invoice as the source of truth for the amount to pay. The app keeps information needed to track the transaction, including invoice ID, amount, currency, status and transaction ID. Sensitive payment details remain handled by the payment provider under its own rules.",
      imagesTitle: "7. Photos and files",
      images: "Uploaded photos are used to display profiles, garages or service-related information. They are stored in the infrastructure used by the app and may be deleted with the account or on request, subject to legal and security requirements.",
      retentionTitle: "8. Retention",
      retention: "Account data is kept while you use the service. After a deletion request, personal data is deleted or anonymized within an operational period of up to 30 days, except where required by law or needed for fraud prevention or evidence. Security logs may be kept for up to 12 months.",
      rightsTitle: "9. Your rights",
      rights: "You may request access, correction, deletion, restriction, objection or portability where applicable. Contact support@wapigarage.cg. Account deletion is available in the app and removes personal data under the retention rules above.",
      securityTitle: "10. Security",
      security: "Communications use HTTPS where available. Mobile sessions are stored in SecureStore and private-resource access is checked server-side. No Internet-connected system can guarantee zero risk.",
      changesTitle: "11. Changes",
      changes: "This policy may be updated to reflect service or regulatory changes. Important changes will be announced in the app. The update date appears at the top of this page.",
    },
  },
} as const;

export type TranslationKey = keyof typeof messages.fr.privacy;

export function t(key: TranslationKey, locale: Locale = "fr"): string {
  return messages[locale].privacy[key] ?? messages.fr.privacy[key];
}
