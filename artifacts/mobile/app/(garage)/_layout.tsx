import { Tabs } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { LayoutGrid, MessageCircle, User, Banknote } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListConversations, useGetMyGarage, useListNotifications } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

// ── Theme palettes ─────────────────────────────────────────────────────────────
const DARK_G = {
  bg:      "#0F0F0F",
  card:    "#1A1A1A",
  card2:   "#222222",
  border:  "#2A2A2A",
  green:   "#34a17a",
  greenBg: "rgba(52,161,122,0.12)",
  text:    "#FFFFFF",
  sub:     "#CCCCCC",
  muted:   "#777777",
  accent:  "#E4B93A",
  red:     "#D9483A",
};

const LIGHT_G = {
  bg:      "#F2F3F5",
  card:    "#FFFFFF",
  card2:   "#EBEBF0",
  border:  "#E5E5EA",
  green:   "#1D7159",
  greenBg: "rgba(29,113,89,0.1)",
  text:    "#1C1C1E",
  sub:     "#3C3C43",
  muted:   "#8E8E93",
  accent:  "#E4B93A",
  red:     "#D9483A",
};

export type GarageTheme = typeof DARK_G;

export function useG(): GarageTheme {
  const { isDark } = useTheme();
  return isDark ? DARK_G : LIGHT_G;
}

// ── Badge icon ────────────────────────────────────────────────────────────────
function BadgeIcon({
  name,
  color,
  badge,
}: {
  name: LucideIcon;
  color: string;
  badge?: number;
}) {
  const G = useG();
  const Icon = name;
  return (
    <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
      <Icon size={22} color={color} />
      {badge ? (
        <View style={{
          position: "absolute", top: -4, right: -6,
          backgroundColor: G.red, borderRadius: 8,
          minWidth: 16, height: 16, alignItems: "center", justifyContent: "center",
          paddingHorizontal: 3,
        }}>
          <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" }}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
function GarageTabLayout() {
  const isIOS = Platform.OS === "ios";
  const { isAuthenticated } = useAuth();
  const G = useG();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const conversations = useListConversations({ query: { enabled: isAuthenticated } as never });
  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  // Messages PRO : uniquement les conversations liées au garage de l'utilisateur
  const unread = (conversations.data ?? [])
    .filter((c) => myGarage.data?.id != null && c.garageId === myGarage.data.id)
    .reduce((a, c) => a + (c.unreadCount ?? 0), 0);
  // Notifications PRO
  const proNotifs = useListNotifications({ target: "pro" }, { query: { enabled: isAuthenticated } as never });
  const unreadProNotifs = (proNotifs.data ?? []).filter((n) => !n.read).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: G.green,
        tabBarInactiveTintColor: G.muted,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 2 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: G.bg,
          borderTopColor: G.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: isIOS ? 88 : 68 + insets.bottom,
          paddingBottom: isIOS ? 28 : 10 + insets.bottom,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: G.bg }]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <BadgeIcon name={LayoutGrid} color={color} badge={unreadProNotifs || undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <BadgeIcon name={MessageCircle} color={color} badge={unread || undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoice"
        options={{
          title: "Facture",
          tabBarIcon: ({ color }) => <BadgeIcon name={Banknote} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon:({ color }) => <BadgeIcon name={User} color={color} />,
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{ href: null }}
      />
    </Tabs>
  );
}

export default GarageTabLayout;
