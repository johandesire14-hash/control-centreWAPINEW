import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";

import { useColors } from "@/hooks/useColors";

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  reviewCount?: number;
}

export function StarRating({ rating, size = 14, showValue = true, reviewCount }: StarRatingProps) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <Star size={size} color={colors.accent} />
      {showValue ? (
        <Text style={[styles.text, { fontSize: size, color: colors.foreground }]}>
          {rating > 0 ? rating.toFixed(1) : "Nouveau"}
        </Text>
      ) : null}
      {typeof reviewCount === "number" ? (
        <Text style={[styles.count, { fontSize: size - 1, color: colors.mutedForeground }]}>
          ({reviewCount})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
  count: {
    fontFamily: "Inter_400Regular",
  },
});
