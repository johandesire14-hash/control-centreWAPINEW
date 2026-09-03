/**
 * Onglet Messages de l'interface Garage Pro.
 * Respecte le thème clair/sombre via useG().
 */
import React, { useRef } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import {
  Alert,
  Animated,
  FlatList,
  PanResponder,
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
import { useListConversations, useGetMyGarage } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Trash2, MessageCircle } from "lucide-react-native";
import { useG } from "./_layout";

const AUTH_TOKEN_KEY = "auth_session_token";

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
  if ((process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")) return `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")}`;
  return "";
}

function SwipeableRow({
  children,
  onDelete,
  deleteColor,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  deleteColor: string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteWidth = 100;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -deleteWidth));
        else translateX.setValue(Math.min(g.dx, 0));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -deleteWidth / 2) {
          Animated.spring(translateX, { toValue: -deleteWidth, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={{ overflow: "hidden" }}>
      <View style={[StyleSheet.absoluteFill, { alignItems: "flex-end", justifyContent: "center", backgroundColor: deleteColor }]}>
        <Pressable
          onPress={() => {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            onDelete();
          }}
          style={{ width: deleteWidth, alignItems: "center", justifyContent: "center", flex: 1, gap: 4 }}
        >
          <Trash2 size={20} color="#fff" />
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Supprimer</Text>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

export default function GarageMessagesScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const G = useG();

  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  const conversations = useListConversations({ query: { enabled: isAuthenticated } as never });

  const garageConversations = (conversations.data ?? []).filter(
    (c) => myGarage.data?.id != null && c.garageId === myGarage.data.id,
  );

  const handleDelete = async (conversationId: number) => {
    Alert.alert("Supprimer la conversation ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
            const base = getApiBaseUrl();
            await fetch(`${base}/api/conversations/${conversationId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            conversations.refetch();
          } catch {}
        },
      },
    ]);
  };

  const isLoading = myGarage.isLoading || conversations.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 20,
        backgroundColor: G.green,
        gap: 2,
      }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: "#FFFFFF" }}>Messages</Text>
        {myGarage.data ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            📨 Vous répondez en tant que {myGarage.data.name}
          </Text>
        ) : null}
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>
          {garageConversations.length} client{garageConversations.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={garageConversations}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={conversations.isRefetching || myGarage.isRefetching}
            onRefresh={() => { conversations.refetch(); myGarage.refetch(); }}
            tintColor={G.green}
          />
        }
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 }}>
              <MessageCircle size={44} color={G.muted} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: G.text }}>
                Aucun message reçu
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: G.muted, textAlign: "center", paddingHorizontal: 40 }}>
                Vos clients peuvent vous contacter depuis votre fiche garage.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const displayName = item.clientName ?? "Client";
          const displayAvatar = item.clientProfileImageUrl;

          return (
            <SwipeableRow onDelete={() => handleDelete(item.id)} deleteColor={G.red}>
              <Pressable
                onPress={() => router.push({ pathname: "/conversation/[id]", params: { id: item.id, mode: "pro" } })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 16,
                  backgroundColor: G.bg,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: G.border,
                }}
              >
                {displayAvatar ? (
                  <Image
                    source={{ uri: getImageUrl(displayAvatar) }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                ) : (
                  <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: G.card,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ color: G.green, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{
                      fontFamily: item.unreadCount ? "Inter_700Bold" : "Inter_600SemiBold",
                      fontSize: 15,
                      color: G.text,
                      flexShrink: 1,
                    }}>
                      {displayName}
                    </Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: G.muted }}>
                      {timeAgo(item.lastMessageAt ?? null)}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: item.unreadCount ? "Inter_500Medium" : "Inter_400Regular",
                      fontSize: 13,
                      color: item.unreadCount ? G.sub : G.muted,
                      flex: 1,
                    }}
                  >
                    {formatLastMessage(item.lastMessage)}
                  </Text>
                </View>
                {item.unreadCount ? (
                  <View style={{
                    backgroundColor: G.green, borderRadius: 10,
                    minWidth: 20, height: 20, alignItems: "center",
                    justifyContent: "center", paddingHorizontal: 5,
                  }}>
                    <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 }}>
                      {item.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </SwipeableRow>
          );
        }}
      />
    </View>
  );
}
