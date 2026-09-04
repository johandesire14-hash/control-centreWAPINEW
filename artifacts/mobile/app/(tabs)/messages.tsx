import React, { useRef } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useListConversations } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { Trash2, MessageCircle } from "lucide-react-native";

const AUTH_TOKEN_KEY = "auth_session_token";
const SCREEN_WIDTH = Dimensions.get("window").width;
// Seuil : 80 % de la largeur → déclenche la confirmation
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.8;

function formatLastMessage(msg: string | null | undefined): string {
  if (!msg) return "Nouvelle conversation";
  if (msg.startsWith("https") || msg.includes("supabase") || msg.includes("storage")) return "📷 Photo";
  return msg;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
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

/**
 * SwipeableRow – Messages
 * • Swipe jusqu'à 80 % de l'écran → Alert de confirmation
 *   – Confirmer : glisse hors écran puis supprime
 *   – Annuler : retour à la position initiale
 * • Lâcher avant 80 % → retour à la position initiale
 */
function SwipeableRow({
  children,
  onConfirmDelete,
}: {
  children: React.ReactNode;
  onConfirmDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const snapBack = () =>
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();

  const slideOut = (cb: () => void) =>
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => cb());

  // Opacité de l'indicateur (apparaît progressivement pendant le swipe)
  const iconOpacity = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, -40, 0],
    outputRange: [1, 0.8, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -SCREEN_WIDTH));
        else translateX.setValue(Math.min(g.dx, 0));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          // Seuil atteint → slide à 100 % d'abord, puis confirmation
          slideOut(() => {
            Alert.alert(
              "Supprimer cette conversation ?",
              "Cette action est irréversible.",
              [
                {
                  text: "Annuler",
                  style: "cancel",
                  onPress: () =>
                    Animated.spring(translateX, {
                      toValue: 0,
                      useNativeDriver: true,
                    }).start(),
                },
                {
                  text: "Supprimer",
                  style: "destructive",
                  onPress: onConfirmDelete,
                },
              ],
            );
          });
        } else {
          snapBack();
        }
      },
    }),
  ).current;

  return (
    <View style={{ overflow: "hidden" }}>
      {/* Fond rouge pleine largeur */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, styles.deleteBackground]}>
          <Animated.View style={[styles.deleteHint, { opacity: iconOpacity }]}>
            <Trash2 size={20} color="#fff" />
            <Text style={styles.deleteHintText}>Supprimer</Text>
          </Animated.View>
        </View>
      </View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const conversations = useListConversations({ query: { enabled: isAuthenticated } as never });
  const clientConversations = (conversations.data ?? []).filter((c) => c.clientId === user?.id);

  const deleteConversation = async (conversationId: number) => {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/conversations/${conversationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    conversations.refetch();
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBlock, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
          <Text style={[styles.header, { color: "#FFFFFF" }]}>Messages</Text>
        </View>
        <EmptyState
          icon={MessageCircle}
          title="Connectez-vous pour voir vos messages"
          description="Échangez avec les garages près de chez vous."
        />
        <Pressable
          onPress={() => router.push("/auth")}
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.loginButtonText}>Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBlock, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.header, { color: "#FFFFFF" }]}>Messages</Text>
      </View>

      <FlatList
        data={clientConversations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 96, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={conversations.isRefetching}
            onRefresh={() => conversations.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          conversations.isLoading ? null : (
            <EmptyState
              icon={MessageCircle}
              title="Aucune conversation"
              description="Contactez un garage depuis son profil pour démarrer une discussion."
            />
          )
        }
        renderItem={({ item }) => {
          const displayName = item.garageName;
          const displayAvatar = item.garageAvatarImageUrl;
          return (
            <SwipeableRow onConfirmDelete={() => deleteConversation(item.id)}>
              <Pressable
                onPress={() => router.push(`/conversation/${item.id}`)}
                style={[
                  styles.row,
                  { backgroundColor: colors.card, borderBottomColor: colors.border },
                ]}
              >
                {displayAvatar ? (
                  <Image source={{ uri: getImageUrl(displayAvatar) }} style={styles.avatar} />
                ) : (
                  <View
                    style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}
                  >
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                      {(displayName ?? "G").charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={[styles.time, { color: colors.mutedForeground }]}>
                      {timeAgo(item.lastMessageAt)}
                    </Text>
                  </View>
                  <View style={styles.rowTop}>
                    <Text
                      style={[
                        styles.lastMessage,
                        {
                          color: item.unreadCount > 0 ? colors.foreground : colors.mutedForeground,
                          fontFamily: item.unreadCount > 0 ? "Inter_500Medium" : "Inter_400Regular",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {formatLastMessage(item.lastMessage)}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View style={[styles.unreadDot, { backgroundColor: colors.primary }]}>
                        <Text style={styles.unreadDotText}>{item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </SwipeableRow>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  header: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15, flexShrink: 1, ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}) },
  time: { fontFamily: "Inter_400Regular", fontSize: 12, ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}) },
  lastMessage: { fontSize: 13, flex: 1, ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}) },
  unreadDot: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadDotText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  loginButton: { marginHorizontal: 20, borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  loginButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  deleteBackground: {
    backgroundColor: "#FF3B30",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 24,
  },
  deleteHint: { alignItems: "center", gap: 4 },
  deleteHintText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
