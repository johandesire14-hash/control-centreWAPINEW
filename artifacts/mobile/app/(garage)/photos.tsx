/**
 * Écran de gestion de la galerie photos — interface Garage Pro.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyGarage,
  useListGaragePhotos,
  useAddGaragePhoto,
  useDeleteGaragePhoto,
  getListGaragePhotosQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useG, type GarageTheme } from "./_layout";
import { getImageUrl } from "@/lib/imageUrl";
import { pickAndUploadMultipleImages } from "@/lib/uploadImage";
import { ArrowLeft, Plus, Trash2, ImageIcon } from "lucide-react-native";

export default function GaragePhotosScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const G = useG();
  const s = useMemo(() => makeStyles(G), [G]);
  const queryClient = useQueryClient();

  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  const garageId = myGarage.data?.id;

  const photos = useListGaragePhotos(garageId!, {
    query: { enabled: !!garageId } as never,
  });

  const addPhoto = useAddGaragePhoto();
  const deletePhoto = useDeleteGaragePhoto();

  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAdd = useCallback(async () => {
    if (!garageId) return;
    setUploading(true);
    try {
      const urls = await pickAndUploadMultipleImages();
      if (!urls.length) return;

      await Promise.all(
        urls.map((url) =>
          addPhoto.mutateAsync({ garageId, data: { url } })
        )
      );

      await queryClient.invalidateQueries({
        queryKey: getListGaragePhotosQueryKey(garageId),
      });
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'envoyer les photos. Réessayez.");
    } finally {
      setUploading(false);
    }
  }, [garageId, addPhoto, queryClient]);

  const handleDelete = useCallback(
    (photoId: number) => {
      if (!garageId) return;
      Alert.alert(
        "Supprimer cette photo ?",
        "Cette action est irréversible.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: async () => {
              setDeletingId(photoId);
              try {
                await deletePhoto.mutateAsync({ garageId, photoId });
                await queryClient.invalidateQueries({
                  queryKey: getListGaragePhotosQueryKey(garageId),
                });
              } catch {
                Alert.alert("Erreur", "Impossible de supprimer la photo.");
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    },
    [garageId, deletePhoto, queryClient]
  );

  const photoList = photos.data ?? [];
  const isLoading = myGarage.isLoading || photos.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 14,
          paddingHorizontal: 16,
          backgroundColor: G.green,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: "#FFFFFF", flex: 1 }}>
          Galerie photos
        </Text>
        <Pressable
          onPress={handleAdd}
          disabled={uploading || !garageId}
          style={[s.addBtn, (uploading || !garageId) && { opacity: 0.5 }]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={G.green} />
          ) : (
            <>
              <Plus size={16} color={G.green} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: G.green }}>
                Ajouter
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={G.green} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Count */}
          <Text style={s.countLabel}>
            {photoList.length} photo{photoList.length !== 1 ? "s" : ""}
          </Text>

          {photoList.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <ImageIcon size={36} color={G.muted} />
              </View>
              <Text style={s.emptyTitle}>Aucune photo</Text>
              <Text style={s.emptyDesc}>
                Ajoutez des photos de votre garage pour attirer plus de clients.
              </Text>
              <Pressable
                onPress={handleAdd}
                disabled={uploading}
                style={[s.emptyBtn, uploading && { opacity: 0.5 }]}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF" }}>
                      Ajouter des photos
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={s.grid}>
              {photoList.map((photo) => (
                <View key={photo.id} style={s.photoCard}>
                  <Image
                    source={{ uri: getImageUrl(photo.url) }}
                    style={s.photo}
                    contentFit="cover"
                  />
                  {/* Delete overlay */}
                  <Pressable
                    onPress={() => handleDelete(photo.id)}
                    style={s.deleteBtn}
                  >
                    {deletingId === photo.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Trash2 size={15} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
              ))}

              {/* Add tile */}
              <Pressable
                onPress={handleAdd}
                disabled={uploading}
                style={[s.addTile, uploading && { opacity: 0.5 }]}
              >
                {uploading ? (
                  <ActivityIndicator color={G.green} />
                ) : (
                  <>
                    <Plus size={24} color={G.green} />
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: G.muted, marginTop: 4 }}>
                      Ajouter
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(G: GarageTheme) {
  const TILE = "47%" as const;
  return StyleSheet.create({
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    countLabel: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: G.muted,
      marginBottom: 14,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    photoCard: {
      width: TILE,
      aspectRatio: 1,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: G.card2,
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    deleteBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    addTile: {
      width: TILE,
      aspectRatio: 1,
      borderRadius: 14,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: G.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: G.card,
    },
    empty: {
      alignItems: "center",
      paddingVertical: 48,
      gap: 12,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: G.card2,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 18,
      color: G.text,
    },
    emptyDesc: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: G.muted,
      textAlign: "center",
      maxWidth: 260,
      lineHeight: 20,
    },
    emptyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: G.green,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 13,
      marginTop: 8,
    },
  });
}
