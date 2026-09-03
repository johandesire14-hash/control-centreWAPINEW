import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import "@/lib/apiClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useGetMyProfile } from "@workspace/api-client-react";
import { ThemeProvider } from "@/lib/theme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { useColors } from "@/hooks/useColors";

// On cache la splash native immédiatement : notre animation Lottie prend le relais.
SplashScreen.hideAsync().catch(() => {});

const queryClient = new QueryClient();

function NavigationGuard({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isAuthenticated, isLoading, isGuest } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  // Ensures the startup mode-redirect runs only once per session
  const didInitialRedirect = useRef(false);

  // Fetch profile to guard the pro view; only runs when authenticated
  const profile = useGetMyProfile({ query: { enabled: isAuthenticated } as never });

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const isOnAuthScreen = segments[0] === "auth";
    const isOnGarageView = segments[0] === "(garage)";

    // Not authenticated → send to login; reset redirect flag for next session.
    if (!isAuthenticated && !isGuest && !isOnAuthScreen) {
      didInitialRedirect.current = false;
      router.replace("/auth");
      return;
    }

    // ── Startup mode redirect ────────────────────────────────────────────────
    // On first authenticated load, send the user to their last saved mode
    // (client tabs or garage dashboard). Onboarding is intentionally skipped.
    if (isAuthenticated && !isOnAuthScreen && !didInitialRedirect.current) {
      didInitialRedirect.current = true;
      const currentSegment = segments[0];
      AsyncStorage.getItem("user_active_mode").then((mode) => {
        const targetSegment = mode === "PRO" ? "(garage)" : "(tabs)";
        if (currentSegment !== targetSegment) {
          router.replace(mode === "PRO" ? "/(garage)" : "/(tabs)");
        }
      });
    }

    // ── Pro view guard ───────────────────────────────────────────────────────
    // If the user has no garage but landed on the garage view (e.g. stale
    // AsyncStorage), redirect to the client view immediately.
    if (isAuthenticated && isOnGarageView && profile.data !== undefined && !profile.data.hasGarage) {
      AsyncStorage.removeItem("user_active_mode");
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, isGuest, segments, navigationState?.key, profile.data]);

  return null;
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colors = useColors();

  return (
    <>
      <NavigationGuard fontsLoaded={fontsLoaded} />
      <Stack
        screenOptions={{
          headerBackTitle: "Retour",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#FFFFFF" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(garage)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="onboarding/profile" options={{ headerShown: false, presentation: "modal", gestureEnabled: false }} />
        <Stack.Screen name="garage/[id]" options={{ title: "" }} />
        <Stack.Screen name="conversation/[id]" options={{ title: "Conversation" }} />
        <Stack.Screen name="onboarding/garage" options={{ title: "Devenir Garage Pro", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Paramètres" }} />
        <Stack.Screen name="about" options={{ title: "À propos" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="certification" options={{ title: "Demande de certification", presentation: "modal" }} />
        <Stack.Screen name="faq" options={{ title: "Centre d'aide" }} />
        <Stack.Screen name="cgu" options={{ title: "CGU" }} />
        <Stack.Screen name="privacy" options={{ title: "Confidentialité" }} />
        <Stack.Screen name="garage/dashboard" options={{ title: "Mon garage" }} />
        <Stack.Screen name="garage/check" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showSplashAnimation, setShowSplashAnimation] = React.useState(true);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <>
                  <StatusBar style="light" />
                  {Platform.OS === 'android' && (
                    <RNStatusBar translucent backgroundColor="transparent" barStyle="light-content" />
                  )}
                  {/* App content — rendered in background while Lottie plays */}
                  {(fontsLoaded || !!fontError) && (
                    <RootLayoutNav fontsLoaded={fontsLoaded || !!fontError} />
                  )}
                  {/* Lottie splash — always shown first, hides itself when done */}
                  {showSplashAnimation && (
                    <AnimatedSplash onFinish={() => setShowSplashAnimation(false)} />
                  )}
                  </>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
