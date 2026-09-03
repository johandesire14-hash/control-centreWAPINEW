/**
 * Écran passerelle conservé pour compatibilité avec d'éventuels liens résiduels.
 * La nouvelle logique envoie tous les utilisateurs directement vers /(tabs) depuis auth.tsx.
 */
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, Stack } from "expo-router";

import { useColors } from "@/hooks/useColors";

export default function GarageCheckScreen() {
  const colors = useColors();

  useEffect(() => {
    router.replace("/(tabs)");
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </>
  );
}
