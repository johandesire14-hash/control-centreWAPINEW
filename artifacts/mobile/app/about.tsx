import React from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { Mail } from "lucide-react-native";

import { useColors } from "@/hooks/useColors";

const icon = require("@/assets/images/icon.png");

export default function AboutScreen() {
  const colors = useColors();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image source={icon} style={styles.logo} />
        <Text style={[styles.appName, { color: colors.foreground }]}>WapiGarage</Text>
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Version 1.0.0</Text>
      </View>

      <Text style={[styles.paragraph, { color: colors.foreground }]}>
        WapiGarage connecte les automobilistes de Brazzaville avec des garages professionnels vérifiés.
        Trouvez rapidement un garage de confiance près de chez vous, consultez les avis d'autres clients
        et échangez directement avec les mécaniciens.
      </Text>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notre mission</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          Améliorer la transparence et la confiance dans le secteur automobile à Brazzaville, en valorisant
          les garages sérieux grâce à un système de certification et d'avis vérifiés.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Confidentialité</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          Vos données personnelles sont utilisées uniquement pour vous mettre en relation avec des garages
          et améliorer votre expérience. Nous ne partageons jamais vos informations avec des tiers sans
          votre consentement.
        </Text>
      </View>

      <View style={styles.contactRow}>
        <Mail size={16} color={colors.mutedForeground} />
        <Text
          style={[styles.link, { color: colors.primary }]}
          onPress={() => Linking.openURL("mailto:contact@wapigarage.cg")}
        >
          contact@wapigarage.cg
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, gap: 20 },
  header: { alignItems: "center", gap: 8, marginBottom: 8 },
  logo: { width: 88, height: 88, borderRadius: 20, backgroundColor: "#0D1A14", overflow: "hidden" },
  appName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  version: { fontFamily: "Inter_400Regular", fontSize: 12 },
  paragraph: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  link: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
