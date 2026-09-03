import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

function Section({ title, children }: { title: string; children: string }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );
}

export default function CguScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.updated, { color: colors.mutedForeground }]}>
        Dernière mise à jour : juillet 2025
      </Text>

      <Section title="1. Objet">
        {`Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile WapiGarage, éditée par WapiGarage SAS, et de l'ensemble des services associés.\n\nEn accédant à l'application, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser l'application.`}
      </Section>

      <Section title="2. Description du service">
        {`WapiGarage est une plateforme de mise en relation entre particuliers et garages automobiles situés à Brazzaville et dans ses environs.\n\nL'application permet notamment de :\n• Consulter les fiches et avis de garages\n• Contacter des garages via messagerie intégrée\n• Laisser des avis sur les garages\n• Gérer un espace garage professionnel`}
      </Section>

      <Section title="3. Accès au service">
        {`L'accès à WapiGarage nécessite la création d'un compte via Google Sign-In. Vous devez être âgé(e) d'au moins 16 ans pour vous inscrire.\n\nVous êtes responsable de la confidentialité de votre compte et de toutes les activités effectuées depuis celui-ci.`}
      </Section>

      <Section title="4. Obligations des utilisateurs">
        {`En utilisant WapiGarage, vous vous engagez à :\n• Fournir des informations exactes et à jour\n• Ne pas publier de contenu illicite, diffamatoire ou trompeur\n• Ne pas usurper l'identité d'un tiers\n• Respecter les droits de propriété intellectuelle\n• Ne pas perturber le fonctionnement de la plateforme`}
      </Section>

      <Section title="5. Contenu utilisateur">
        {`Les avis, messages et informations que vous publiez sur WapiGarage restent votre propriété. En les publiant, vous accordez à WapiGarage une licence mondiale, non exclusive et gratuite pour les afficher dans le cadre du service.\n\nWapiGarage se réserve le droit de supprimer tout contenu contraire aux présentes CGU ou à la législation en vigueur.`}
      </Section>

      <Section title="6. Responsabilité">
        {`WapiGarage agit en qualité d'intermédiaire technique et n'est pas partie aux transactions ou accords entre utilisateurs et garages.\n\nWapiGarage ne saurait être tenu responsable de la qualité des prestations réalisées par les garages référencés, ni des préjudices résultant d'une mauvaise utilisation de l'application.`}
      </Section>

      <Section title="7. Modification et résiliation">
        {`WapiGarage se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs en seront informés via l'application.\n\nVotre compte peut être suspendu ou supprimé en cas de violation des présentes CGU ou de la législation applicable.`}
      </Section>

      <Section title="8. Droit applicable">
        {`Les présentes CGU sont régies par le droit de la République du Congo. Tout litige relatif à leur application sera soumis aux tribunaux compétents de Brazzaville.\n\nPour toute question, contactez-nous à : support@wapigarage.cg`}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  updated: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 8,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
});
