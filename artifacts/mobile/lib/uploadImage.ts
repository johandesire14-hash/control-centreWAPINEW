import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "auth_session_token";

function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")
    ? `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")}`
    : "";
}

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted) return true;

  Alert.alert(
    "Permission requise",
    "WapiGarage a besoin d'accéder à vos photos.",
    [{ text: "OK" }],
  );
  return false;
}

async function ensureCameraPermission(): Promise<boolean> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.granted) return true;

  Alert.alert(
    "Permission requise",
    "WapiGarage a besoin d'accéder à votre appareil photo.",
    [{ text: "OK" }],
  );
  return false;
}

async function uploadAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const contentType = asset.mimeType ?? "image/jpeg";
  const apiBase = getApiBaseUrl();

  if (!apiBase) {
    throw new Error("EXPO_PUBLIC_DOMAIN non configuré");
  }

  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error("Non authentifié");
  }

  // Lire le fichier en ArrayBuffer
  const arrayBuffer = await new File(asset.uri).arrayBuffer();

  const response = await fetch(`${apiBase}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${token}`,
    },
    body: arrayBuffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Échec de l'envoi de l'image : ${text}`);
  }

  const { url } = (await response.json()) as { url: string };
  return url;
}

export async function pickAndUploadImage(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
}): Promise<string | null> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: options?.allowsEditing ?? false,
    aspect: options?.aspect,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  return uploadAsset(result.assets[0]);
}

export async function pickAndUploadMultipleImages(): Promise<string[]> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 0.8,
    selectionLimit: 6,
  });

  if (result.canceled || !result.assets?.length) return [];

  const urls = await Promise.all(result.assets.map((asset) => uploadAsset(asset)));
  return urls;
}
