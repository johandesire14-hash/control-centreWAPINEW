import React, { useCallback, useRef } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Trash2, MessageCircle, Star, Heart, Bell } from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  NotificationTarget,
  NotificationType,
  type Notification,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/EmptyState";

const AUTH_TOKEN_KEY = "auth_session_token";
const SCREEN_WIDTH = Dimensions.get("window").width;

// Seuil : 40% de la largeur → déclenche la suppression
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;
// Largeur du panneau rouge révélé pendant le swipe
const DELETE_ZONE_WIDTH = 96;

// Clé de base React Query pour toutes les instances useListNotifications
const NOTIF_QUERY_BASE_KEY = "/api/notifications";

function iconFor(type: Notification["type"]): LucideIcon {
  if (type === NotificationType.message) return MessageCircle;
  if (type === NotificationType.review) return Star;
  return Heart;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

function getApiBaseUrl(): string {
  if ((process.env.EXPO_PUBLIC_API_DOMAIN || "")) return `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "")}`;
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// SwipeableRow
//
// Swipe gauche :
//   • Révèle un panneau rouge (DELETE_ZONE_WIDTH) sur la droite
//     avec l'icône 🗑 et le texte SUPPRIMER
//   • Relâcher avant 40 % → retour en place (spring)
//   • Relâcher après 40 %  → glisse hors écran puis appelle onDelete()
// ─────────────────────────────────────────────────────────────────────────────
function SwipeableRow({
  children,
  backgroundColor,
  onDelete,
}: {
  children: React.ReactNode;
  backgroundColor: string;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  // Zone rouge révélée : de 0 (repos) à DELETE_ZONE_WIDTH (pleinement visible)
  const deleteZoneScale = translateX.interpolate({
    inputRange: [-DELETE_ZONE_WIDTH, 0],
    outputRange: [1, 0.7],
    extrapolate: "clamp",
  });

  // Opacité icône + texte : apparaît dès que la carte bouge
  const deleteContentOpacity = translateX.interpolate({
    inputRange: [-DELETE_ZONE_WIDTH, -24, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        // Seulement swipe gauche ; limite à -SCREEN_WIDTH
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -SCREEN_WIDTH));
        else translateX.setValue(Math.min(g.dx, 0));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          // Seuil atteint → glisse complètement hors écran, puis supprime
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 220,
            useNativeDriver: true,
          }).start(() => onDelete());
        } else {
          // Retour en place
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.swipeContainer}>
      {/* ── Fond de la carte (gauche) + zone rouge (droite) ── */}
      <View style={[StyleSheet.absoluteFill, styles.swipeBg]}>
        {/* Zone gauche : même couleur que la carte pour qu'elle reste invisible */}
        <View style={[styles.swipeBgLeft, { backgroundColor }]} />
        {/* Zone rouge à droite */}
        <View style={styles.deleteZone}>
          <Animated.View
            style={[
              styles.deleteContent,
              {
                opacity: deleteContentOpacity,
                transform: [{ scale: deleteZoneScale }],
              },
            ]}
          >
            <Trash2 size={22} color="#fff" strokeWidth={2.2} />
            <Text style={styles.deleteLabel}>SUPPRIMER</Text>
          </Animated.View>
        </View>
      </View>

      {/* ── Carte glissante ── */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Écran principal
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const target: NotificationTarget =
    mode === "pro" ? NotificationTarget.pro : NotificationTarget.client;

  const notifications = useListNotifications({ target });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Marque toutes les notifs comme lues dès l'ouverture de l'écran
  useFocusEffect(
    useCallback(() => {
      if ((notifications.data ?? []).some((n) => !n.read)) {
        markAllRead.mutate(
          { params: { target } },
          { onSuccess: () => invalidateAll() },
        );
      }
    }, [notifications.data]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * Invalide toutes les instances useListNotifications (client + pro)
   * pour que les badges dans les tab bars se mettent à jour immédiatement.
   */
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [NOTIF_QUERY_BASE_KEY] });
  }, [queryClient]);

  const deleteNotification = useCallback(
    async (notificationId: number) => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/notifications/${notificationId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Pas bloquant : la refetch corrigera l'état
      } finally {
        invalidateAll();
      }
    },
    [invalidateAll],
  );

  const handlePress = useCallback(
    async (item: Notification) => {
      if (!item.read) {
        markRead.mutate({ notificationId: item.id });
      }
      if (item.type === NotificationType.message && item.relatedId) {
        router.push(`/conversation/${item.relatedId}`);
      } else if (item.type === NotificationType.review) {
        router.push("/(garage)/reviews");
      }
      await deleteNotification(item.id);
    },
    [markRead, deleteNotification],
  );

  const cardBg = (read: boolean) =>
    read ? colors.background : colors.secondary + "60";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {(notifications.data ?? []).some((n) => !n.read) ? (
        <Pressable
          onPress={() =>
            markAllRead.mutate(
              { params: { target } },
              { onSuccess: () => invalidateAll() },
            )
          }
          style={styles.markAllRow}
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            Tout marquer comme lu
          </Text>
        </Pressable>
      ) : null}

      <FlatList
        data={notifications.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        ListEmptyComponent={
          notifications.isLoading ? null : (
            <EmptyState icon={Bell} title="Aucune notification" />
          )
        }
        renderItem={({ item }) => (
          <SwipeableRow
            backgroundColor={cardBg(item.read)}
            onDelete={() => deleteNotification(item.id)}
          >
            <Pressable
              onPress={() => handlePress(item)}
              style={[
                styles.row,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: cardBg(item.read),
                },
              ]}
            >
              <View
                style={[styles.iconWrap, { backgroundColor: colors.secondary }]}
              >
                {(() => {
                  const NotiIcon = iconFor(item.type);
                  return <NotiIcon size={16} color={colors.primary} />;
                })()}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.content, { color: colors.foreground }]}
                  numberOfLines={3}
                >
                  {item.content}
                </Text>
                <Text
                  style={[styles.time, { color: colors.mutedForeground }]}
                >
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
              {!item.read ? (
                <View
                  style={[styles.dot, { backgroundColor: colors.primary }]}
                />
              ) : null}
            </Pressable>
          </SwipeableRow>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  markAllRow: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  markAllText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  // ── SwipeableRow ────────────────────────────────────────────────────────────
  swipeContainer: { overflow: "hidden" },
  swipeBg: { flexDirection: "row" },
  swipeBgLeft: { flex: 1 },
  deleteZone: {
    width: DELETE_ZONE_WIDTH,
    backgroundColor: "#B71C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteContent: { alignItems: "center", gap: 5 },
  deleteLabel: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },

  // ── Ligne de notification ───────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { fontFamily: "Inter_500Medium", fontSize: 13.5, lineHeight: 19 },
  time: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
