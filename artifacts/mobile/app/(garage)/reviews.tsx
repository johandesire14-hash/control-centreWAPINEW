/**
 * Onglet Avis de l'interface Garage Pro.
 * Respecte le thème clair/sombre via useG().
 */
import React, { useMemo } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetMyGarage, useListGarageReviews } from "@workspace/api-client-react";
import { Star } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { useG, type GarageTheme } from "./_layout";

function Stars({ rating, size = 14, borderColor }: { rating: number; size?: number; borderColor: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={i <= Math.round(rating) ? "#E4B93A" : borderColor}
        />
      ))}
    </View>
  );
}

export default function GarageReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const G = useG();
  const s = useMemo(() => makeStyles(G), [G]);

  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  const g = myGarage.data;
  const reviews = useListGarageReviews(g?.id ?? 0, { query: { enabled: !!g } as never });

  const ratingDisplay = g && g.reviewCount > 0 ? (g.averageRating ?? 0).toFixed(1) : "—";

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 20,
        backgroundColor: G.green,
      }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: "#FFFFFF" }}>Avis reçus</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
          {g?.reviewCount ?? 0} avis au total
        </Text>
      </View>

      {/* Rating summary card */}
      {g && g.reviewCount > 0 ? (
        <View style={s.summaryCard}>
          <Text style={s.summaryRating}>{ratingDisplay}</Text>
          <View style={{ gap: 6 }}>
            <Stars rating={g.averageRating ?? 0} size={18} borderColor={G.border} />
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: G.muted }}>
              Basé sur {g.reviewCount} avis
            </Text>
          </View>
        </View>
      ) : null}

      <FlatList
        data={reviews.data ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={reviews.isRefetching}
            onRefresh={() => reviews.refetch()}
            tintColor={G.green}
          />
        }
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={
          reviews.isLoading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <ActivityIndicator color={G.green} />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 }}>
              <Star size={44} color={G.muted} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: G.text }}>
                Aucun avis pour le moment
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: G.muted, textAlign: "center", paddingHorizontal: 40 }}>
                Vos clients peuvent laisser un avis depuis votre fiche garage.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={s.reviewCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {item.userProfileImageUrl ? (
                <Image source={{ uri: getImageUrl(item.userProfileImageUrl) }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, { backgroundColor: G.card2, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: G.muted, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    {item.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: G.text }}>
                  {item.userName}
                </Text>
                <Stars rating={item.rating} size={13} borderColor={G.border} />
              </View>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: G.muted }}>
                {new Date(item.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            {item.comment ? (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: G.sub, marginTop: 10, lineHeight: 20 }}>
                {item.comment}
              </Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(G: GarageTheme) {
  return StyleSheet.create({
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
      margin: 16,
      backgroundColor: G.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
      padding: 20,
    },
    summaryRating: {
      fontFamily: "Inter_700Bold",
      fontSize: 48,
      color: G.text,
    },
    reviewCard: {
      backgroundColor: G.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
      padding: 16,
    },
    avatar: { width: 42, height: 42, borderRadius: 21 },
  });
}
