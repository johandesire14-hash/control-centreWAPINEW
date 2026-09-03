import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { User, Wrench } from "lucide-react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdateMyProfile } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

type Choice = "client" | "garage_pro";

export default function AccountTypeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const [selected, setSelected] = useState<Choice | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    updateProfile.mutate(
      { data: { accountType: selected } },
      {
        onSuccess: () => {
          router.replace({ pathname: "/onboarding/profile", params: { accountType: selected } });
        },
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Bienvenue{user?.firstName ? ` ${user.firstName}` : ""} !
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Comment allez-vous utiliser WapiGarage ?
          </Text>
        </View>

        <View style={styles.options}>
          <Pressable
            onPress={() => setSelected("client")}
            style={[
              styles.card,
              {
                borderColor: selected === "client" ? colors.primary : colors.border,
                backgroundColor: selected === "client" ? colors.secondary : colors.card,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <User size={26} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Je suis un client</Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              Je cherche un garage fiable pour entretenir mon véhicule.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelected("garage_pro")}
            style={[
              styles.card,
              {
                borderColor: selected === "garage_pro" ? colors.primary : colors.border,
                backgroundColor: selected === "garage_pro" ? colors.secondary : colors.card,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Wrench size={26} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Je suis un professionnel</Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              Je gère un garage et je veux être visible sur WapiGarage.
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleContinue}
          disabled={!selected || updateProfile.isPending}
          style={[
            styles.continueButton,
            { backgroundColor: colors.primary, opacity: !selected || updateProfile.isPending ? 0.6 : 1 },
          ]}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continuer</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  options: {
    gap: 16,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  cardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  continueButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
