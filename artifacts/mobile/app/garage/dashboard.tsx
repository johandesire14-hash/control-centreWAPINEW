/**
 * Redirection vers la nouvelle interface Garage Pro.
 * Ce fichier est conservé pour compatibilité avec d'éventuels liens résiduels.
 */
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, Stack } from "expo-router";

export default function GarageDashboardRedirect() {
  useEffect(() => {
    router.replace("/(garage)");
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F0F0F" }}>
        <ActivityIndicator size="large" color="#34a17a" />
      </View>
    </>
  );
}
