import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CheckCircle } from "lucide-react-native";

import { useColors } from "@/hooks/useColors";

export function CertifiedBadge({ compact = false }: { compact?: boolean }) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.primary,
          paddingHorizontal: compact ? 6 : 8,
          paddingVertical: compact ? 3 : 4,
        },
      ]}
    >
      <CheckCircle size={compact ? 10 : 12} color={colors.primaryForeground} />
      {!compact ? (
        <Text style={[styles.label, { color: colors.primaryForeground }]}>Certifié</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 100,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
});
