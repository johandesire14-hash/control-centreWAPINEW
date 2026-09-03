import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { Clock, Upload, X } from "lucide-react-native";
import { router } from "expo-router";
import { getImageUrl } from "@/lib/imageUrl";
import {
  useCreateCertificationRequest,
  useListMyCertificationRequests,
  CertificationStatus,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { pickAndUploadMultipleImages } from "@/lib/uploadImage";

const statusLabels: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

export default function CertificationScreen() {
  const colors = useColors();
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const requests = useListMyCertificationRequests();
  const createRequest = useCreateCertificationRequest();

  const pending = (requests.data ?? []).find((r) => r.status === CertificationStatus.pending);

  const handlePickDocs = async () => {
    try {
      setUploading(true);
      const urls = await pickAndUploadMultipleImages();
      setDocumentUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (documentUrls.length === 0) {
      Alert.alert("Documents requis", "Ajoutez au moins un document justificatif.");
      return;
    }
    createRequest.mutate(
      { data: { documentUrls } },
      {
        onSuccess: () => {
          Alert.alert("Demande envoyée", "Votre demande de certification a été soumise avec succès.");
          router.back();
        },
        onError: () => Alert.alert("Erreur", "Impossible d'envoyer la demande."),
      },
    );
  };

  if (requests.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (pending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Clock size={40} color={colors.primary} />
        <Text style={[styles.pendingTitle, { color: colors.foreground }]}>Demande en cours d'examen</Text>
        <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>
          Votre demande de certification est en attente de validation par notre équipe.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Devenir un garage certifié</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Ajoutez vos documents (registre de commerce, patente, pièce d'identité) pour que notre équipe puisse
        vérifier votre garage.
      </Text>

      <Pressable
        onPress={handlePickDocs}
        disabled={uploading}
        style={[styles.uploadButton, { borderColor: colors.primary }]}
      >
        {uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Upload size={18} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Ajouter des documents</Text>
          </>
        )}
      </Pressable>

      {documentUrls.length ? (
        <View style={styles.docsGrid}>
          {documentUrls.map((url, idx) => (
            <View key={url + idx} style={styles.docWrap}>
              <Image source={{ uri: getImageUrl(url) }} style={styles.docImage} contentFit="cover" />
              <Pressable
                onPress={() => setDocumentUrls((prev) => prev.filter((u) => u !== url))}
                style={styles.docRemove}
              >
                <X size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {requests.data?.length ? (
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.foreground }]}>Historique</Text>
          {requests.data.map((r) => (
            <View key={r.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                {new Date(r.createdAt).toLocaleDateString("fr-FR")}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                {statusLabels[r.status] ?? r.status}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={createRequest.isPending}
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.submitButtonText}>{createRequest.isPending ? "Envoi…" : "Soumettre la demande"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  container: { padding: 20, paddingBottom: 60, gap: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    borderStyle: "dashed",
  },
  uploadButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  docsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  docWrap: { position: "relative" },
  docImage: { width: 80, height: 80, borderRadius: 10 },
  docRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  historySection: { marginTop: 10, gap: 8 },
  historyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  submitButton: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  submitButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  pendingTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, textAlign: "center" },
  pendingText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
