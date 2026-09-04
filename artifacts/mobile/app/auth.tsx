import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import type { LucideIcon } from "lucide-react-native";
import { Lock, Shield, Star, Zap } from "lucide-react-native";
import { GoogleIcon } from "@/components/GoogleIcon";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

const icon = require("@/assets/images/icon.png");

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isNewUser, isLoading, login, clearIsNewUser, enterGuestMode } = useAuth();
  const handledNewUser = useRef(false);
  // Prevents the returning-user async flow from firing more than once,
  // even if the effect re-runs due to React batching or strict-mode double-invoke.
  const returningUserStarted = useRef(false);
  const { message } = useLocalSearchParams<{ message?: string }>();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // New users go directly to the client home; profile completion is optional.
    if (isNewUser) {
      if (handledNewUser.current) return;
      handledNewUser.current = true;
      clearIsNewUser();
      AsyncStorage.removeItem("user_active_mode").catch(() => {});
      router.replace("/(tabs)");
      return;
    }

    // If we already redirected a new user, stop here so we don't override that
    // navigation on the next effect run (when isNewUser→false).
    if (handledNewUser.current) return;

    // Returning user → restore the appropriate home view.
    if (returningUserStarted.current) return;
    returningUserStarted.current = true;

    (async () => {
      try {
        const token = await SecureStore.getItemAsync("auth_session_token");
        const apiBase = (process.env.EXPO_PUBLIC_API_DOMAIN || "")
          ? `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "")}`
          : "";
        const res = await fetch(`${apiBase}/api/profile`, {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        const data = await res.json();

        if (data?.hasGarage) {
          await AsyncStorage.setItem("user_active_mode", "PRO");
          router.replace("/(garage)");
        } else {
          await AsyncStorage.removeItem("user_active_mode");
          router.replace("/(tabs)");
        }
      } catch {
        // On any network/parse error, fall back to the client home tab.
        await AsyncStorage.removeItem("user_active_mode");
        router.replace("/(tabs)");
      }
    })();
  }, [isLoading, isAuthenticated, isNewUser]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Skip button */}
        <Pressable
          onPress={() => { enterGuestMode(); router.replace("/(tabs)"); }}
          style={[styles.skipButton, { top: insets.top + 12 }]}
          hitSlop={12}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Ignorer</Text>
        </Pressable>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & branding */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Image source={icon} style={styles.logoImage} contentFit="contain" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>WapiGarage</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Le réseau auto de Brazzaville
            </Text>
            {message ? (
              <View style={[styles.messageBanner, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <Lock size={14} color={colors.primary} />
                <Text style={[styles.messageText, { color: colors.foreground }]}>{message}</Text>
              </View>
            ) : null}
          </View>

          {/* Feature pills */}
          <View style={styles.featurePills}>
            {([
              { icon: Shield, label: "Garages vérifiés" },
              { icon: Star, label: "Avis certifiés" },
              { icon: Zap, label: "Urgences 24h" },
            ] as { icon: LucideIcon; label: string }[]).map((f) => (
              <View key={f.label} style={[styles.featurePill, { backgroundColor: colors.card }]}>
                {(() => { const FIcon = f.icon; return <FIcon size={14} color={colors.primary} />; })()}
                <Text style={[styles.featurePillText, { color: colors.foreground }]}>{f.label}</Text>
              </View>
            ))}
          </View>

          {/* Google login */}
          <Pressable
            onPress={async () => { await login(); }}
            disabled={isLoading}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <GoogleIcon size={18} />
                <Text style={styles.primaryButtonText}>Continuer avec Google</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
            En continuant, vous acceptez nos{" "}
            <Text
              style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}
              onPress={() => router.push("/about")}
            >
              CGU et notre politique de confidentialité
            </Text>
            .
          </Text>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  skipButton: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 32,
  },
  logoWrap: { alignItems: "center", gap: 10 },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: "#0D1A14",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#1D7159",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImage: { width: "85%", height: "85%" },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, textAlign: "center" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  messageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  messageText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, textAlign: "center" },
  featurePills: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  featurePillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    paddingVertical: 17,
    shadowColor: "#1D7159",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  legalText: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 },
});
