import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 700);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.title}>WapiGarage</Text>
      <ActivityIndicator size="small" color="#E4B93A" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: "#0D0D0A",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 18,
  },
});
