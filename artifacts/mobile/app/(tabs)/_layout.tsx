import { Tabs } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { Home, Search, MessageCircle, User } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListConversations, useListNotifications } from "@workspace/api-client-react";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

// ── Palettes ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:     "#0F0F0F",
  border: "#2A2A2A",
  green:  "#34a17a",
  muted:  "#777777",
};

const LIGHT = {
  bg:     "#F2F3F5",
  border: "#E5E5EA",
  green:  "#1D7159",
  muted:  "#8E8E93",
};

function DisabledTabButton({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[style, { opacity: 0.35 }]} pointerEvents="none">
      {children}
    </View>
  );
}

function BadgeIcon({ icon: Icon, color, badge }: { icon: LucideIcon; color: string; badge?: number }) {
  return (
    <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
      <Icon size={22} color={color} />
      {badge ? (
        <View style={{
          position: "absolute", top: -4, right: -6,
          backgroundColor: "#D9483A", borderRadius: 8,
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

export default function TabLayout() {
  const { isGuest, isAuthenticated, user } = useAuth();
  const { isDark } = useTheme();
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();

  const G = isDark ? DARK : LIGHT;

  // ── Badges CLIENT ─────────────────────────────────────────────────────────
  // Messages : conversations où l'utilisateur est le client (pas le garage)
  const conversations = useListConversations({ query: { enabled: isAuthenticated } as never });
  const unreadMessages = (conversations.data ?? [])
    .filter((c) => c.clientId === user?.id)
    .reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  // Notifications : uniquement le contexte "client"
  const clientNotifs = useListNotifications({ target: "client" }, { query: { enabled: isAuthenticated } as never });
  const unreadNotifs = (clientNotifs.data ?? []).filter((n) => !n.read).length;

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
          title: "Accueil",
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Recherche",
          tabBarIcon: ({ color }) => <Search size={22} color={color} />,
        }}
      />

      {/* pay screen accessible via profil only */}
      <Tabs.Screen name="pay" options={{ href: null }} />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <BadgeIcon icon={MessageCircle} color={color} badge={unreadMessages || undefined} />
          ),
          tabBarButton: isGuest
            ? (props) => (
                <DisabledTabButton style={props.style}>
                  {props.children}
                </DisabledTabButton>
              )
            : undefined,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Mon Espace",
          tabBarIcon: ({ color }) => (
            <BadgeIcon icon={User} color={color} badge={unreadNotifs || undefined} />
          ),
          tabBarButton: isGuest
            ? (props) => (
                <DisabledTabButton style={props.style}>
                  {props.children}
                </DisabledTabButton>
              )
            : undefined,
        }}
      />
    </Tabs>
  );
}
