/**
 * ProxyImage — drop-in replacement for expo-image's <Image>.
 *
 * Adds:
 * - onError fallback: shows a neutral placeholder instead of a broken image
 * - debug logging: URL requested + error details (removable once stable)
 *
 * Usage: identical to <Image> from expo-image. Just swap the import.
 */

import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Image, type ImageProps, type ImageErrorEventData } from "expo-image";
import { ImageIcon } from "lucide-react-native";

// ---------------------------------------------------------------------------
// Fallback placeholder shown when the image fails to load
// ---------------------------------------------------------------------------
function ImageFallback({ style }: { style?: ImageProps["style"] }) {
  return (
    <View style={[styles.fallback, style as object]}>
      <ImageIcon size={28} color="#9ca3af" strokeWidth={1.5} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ProxyImage
// ---------------------------------------------------------------------------
export function ProxyImage(props: ImageProps) {
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(
    (e: ImageErrorEventData) => {
      const url =
        typeof props.source === "object" &&
        props.source !== null &&
        !Array.isArray(props.source) &&
        "uri" in props.source
          ? (props.source as { uri?: string }).uri
          : String(props.source);

      console.warn("[ProxyImage] load error — URL:", url, "| error:", e);
      setFailed(true);
      props.onError?.(e);
    },
    [props],
  );

  if (failed) {
    return <ImageFallback style={props.style} />;
  }

  return <Image {...props} cachePolicy={props.cachePolicy ?? "memory-disk"} onError={handleError} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
});
