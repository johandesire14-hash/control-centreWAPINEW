import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { t } from "@/lib/i18n";

const sections = [
  ["controllerTitle", "controller"],
  ["collectedTitle", "collected"],
  ["purposesTitle", "purposes"],
  ["legalTitle", "legal"],
  ["sharingTitle", "sharing"],
  ["paymentTitle", "payment"],
  ["imagesTitle", "images"],
  ["retentionTitle", "retention"],
  ["rightsTitle", "rights"],
  ["securityTitle", "security"],
  ["changesTitle", "changes"],
] as const;

type SectionKey = Parameters<typeof t>[0];

function Section({ title, body }: { title: SectionKey; body: SectionKey }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t(title)}</Text>
      <Text style={[styles.body, { color: colors.foreground }]}>{t(body)}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      accessibilityLabel={t("title")}
    >
      <Text style={[styles.updated, { color: colors.mutedForeground }]}>{t("updated")}</Text>
      {sections.map(([title, body]) => (
        <Section key={title} title={title} body={body} />
      ))}
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
