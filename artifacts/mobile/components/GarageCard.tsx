import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { Wrench, Heart, Zap, MapPin } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { StarRating } from "@/components/StarRating";
import { CertifiedBadge } from "@/components/CertifiedBadge";
import { specialtyLabels } from "@/constants/labels";
import type { GarageSummary } from "@workspace/api-client-react";
import { getImageUrl } from "@/lib/imageUrl";

interface GarageCardProps {
  garage: GarageSummary;
  onToggleFavorite?: (garage: GarageSummary) => void;
}

export function GarageCard({ garage, onToggleFavorite }: GarageCardProps) {
  const colors = useColors();
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/garage/${garage.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.imageWrap}>
        {garage.coverImageUrl && !imageError ? (
          <Image
            source={{ uri: getImageUrl(garage.coverImageUrl) }}
            style={styles.image}
            contentFit="cover"
            recyclingKey={String(garage.id)}
            transition={200}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.secondary }]}>
            <Wrench size={28} color={colors.mutedForeground} />
          </View>
        )}

        {/* Top-left certified badge */}
        {garage.certified ? (
          <View style={styles.badgeOverlay}>
            <CertifiedBadge compact />
          </View>
        ) : null}

        {/* Top-right favorite button */}
        {onToggleFavorite ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleFavorite(garage);
            }}
            style={[
              styles.favoriteButton,
              { backgroundColor: garage.isFavorite ? colors.destructive : "rgba(0,0,0,0.28)" },
            ]}
            hitSlop={8}
          >
            <Heart size={14} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {/* Emergency badge */}
        {garage.emergencyAvailable ? (
          <View style={[styles.emergencyBadge, { backgroundColor: colors.destructive }]}>
            <Zap size={10} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {garage.name}
        </Text>
        <View style={styles.row}>
          <MapPin size={11} color={colors.mutedForeground} />
          <Text style={[styles.neighborhood, { color: colors.mutedForeground }]} numberOfLines={1}>
            {garage.neighborhood}
          </Text>
        </View>
        <View style={styles.rowBetween}>
          <StarRating rating={garage.averageRating} reviewCount={garage.reviewCount} />
        </View>
        {garage.specialties?.length ? (
          <Text style={[styles.specialties, { color: colors.mutedForeground }]} numberOfLines={1}>
            {garage.specialties?.map((s) => specialtyLabels[s] ?? s).join(" · ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    // NOTE: overflow:"hidden" is intentionally NOT here — on Android, combining
    // overflow:"hidden" with elevation on the same View breaks child rendering.
    // The imageWrap below handles top-corner clipping; the content area never overflows.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    // Round only the top corners to match the card — no elevation here so clipping works on Android.
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  image: {
    width: "100%",
    height: 150,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 14,
    gap: 5,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  neighborhood: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  specialties: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
});
