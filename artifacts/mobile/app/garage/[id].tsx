import React, { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { Zap, MessageCircle, Phone, Clock, Users, Lock, Star, Pencil, X, Heart, Info, MapPin, ImageIcon, Wrench, MoreVertical, Flag, Share2 } from "lucide-react-native";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useAddFavorite,
  useCreateGarageReview,
  useGetGarage,
  useGetMyGarage,
  useListGaragePhotos,
  useListGarageReviews,
  useRemoveFavorite,
  useStartConversation,
  getListMyFavoritesQueryKey,
  getListTopRatedGaragesQueryKey,
  getListCertifiedGaragesQueryKey,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { getImageUrl } from "@/lib/imageUrl";
import { StarRating } from "@/components/StarRating";
import { CertifiedBadge } from "@/components/CertifiedBadge";
import { EmptyState } from "@/components/EmptyState";
import { dayLabels, repairDelayLabels, specialtyLabels } from "@/constants/labels";

type TabKey = "info" | "avis" | "galerie";

export default function GarageDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const garageId = Number(id);
  const { isAuthenticated, isGuest } = useAuth();

  const { preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const isPreview = preview === "true";

  const [tab, setTab] = useState<TabKey>("info");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const garage = useGetGarage(garageId);
  const reviews = useListGarageReviews(garageId);
  const photos = useListGaragePhotos(garageId);
  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  const isOwnGarage = isAuthenticated && !!myGarage.data && myGarage.data.id === garageId && !isPreview;

  useFocusEffect(
    useCallback(() => {
      photos.refetch();
    }, [garageId]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const queryClient = useQueryClient();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const createReview = useCreateGarageReview();
  const startConversation = useStartConversation();

  const showSelfBlockAlert = () =>
    Alert.alert("Action impossible", "Vous ne pouvez pas interagir avec votre propre garage.");

  const toggleFavorite = () => {
    if (isOwnGarage) { showSelfBlockAlert(); return; }
    if (!isAuthenticated) { router.push("/auth"); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const onSuccess = () => {
      garage.refetch();
      queryClient.invalidateQueries({ queryKey: getListMyFavoritesQueryKey() });
    };
    if (garage.data?.isFavorite) {
      removeFavorite.mutate({ garageId }, { onSuccess });
    } else {
      addFavorite.mutate({ garageId }, { onSuccess });
    }
  };

  const handleContact = () => {
    if (isOwnGarage) { showSelfBlockAlert(); return; }
    if (!isAuthenticated) {
      router.push({ pathname: "/auth", params: { message: "Connectez-vous pour contacter ce garage" } });
      return;
    }
    startConversation.mutate(
      { data: { garageId } },
      {
        onSuccess: (conv) => router.push(`/conversation/${conv.id}`),
        onError: () => Alert.alert("Erreur", "Impossible de démarrer la conversation."),
      },
    );
  };

  const handleShare = async () => {
    setShowMoreMenu(false);
    const g = garage.data;
    if (!g) return;
    try {
      await Share.share({
        title: g.name,
        message: `Découvre ${g.name} sur WapiGarage — ${g.neighborhood}, ${g.address}`,
      });
    } catch {
      // user dismissed
    }
  };

  const handleReport = () => {
    setShowMoreMenu(false);
    Alert.alert(
      "Signaler ce garage",
      "Voulez-vous signaler ce garage pour un contenu inapproprié ou une information incorrecte ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Signaler",
          style: "destructive",
          onPress: () =>
            Alert.alert("Signalement envoyé", "Merci, notre équipe va examiner ce garage."),
        },
      ],
    );
  };

  const handleSubmitReview = () => {
    createReview.mutate(
      {
        garageId,
        data: {
          rating: reviewRating,
          comment: reviewComment || undefined,
          qualityRating: reviewRating,
          honestyRating: reviewRating,
          punctualityRating: reviewRating,
          valueRating: reviewRating,
        },
      },
      {
        onSuccess: () => {
          setShowReviewForm(false);
          setReviewComment("");
          reviews.refetch();
          garage.refetch();
          queryClient.invalidateQueries({ queryKey: getListTopRatedGaragesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCertifiedGaragesQueryKey() });
        },
        onError: () => Alert.alert("Erreur", "Impossible d'envoyer votre avis."),
      },
    );
  };

  if (garage.isLoading || !garage.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const g = garage.data;

  return (
    <>
      <Stack.Screen options={{ title: g.name }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Self-ownership banner */}
        {isOwnGarage ? (
          <View style={[styles.selfBanner, { backgroundColor: colors.secondary }]}>
            <Info size={14} color={colors.mutedForeground} />
            <Text style={[styles.selfBannerText, { color: colors.mutedForeground }]}>
              Vous ne pouvez pas interagir avec votre propre garage.
            </Text>
          </View>
        ) : null}

        {/* Cover image */}
        <View style={styles.coverWrap}>
          {g.coverImageUrl ? (
            <Image source={{ uri: getImageUrl(g.coverImageUrl) }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }]}>
              <Wrench size={48} color={colors.mutedForeground} />
            </View>
          )}
          <Pressable
            onPress={toggleFavorite}
            style={[
              styles.favoriteButton,
              { backgroundColor: g.isFavorite ? colors.destructive : "rgba(0,0,0,0.32)" },
              isOwnGarage && { opacity: 0.35 },
            ]}
          >
            <Heart size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Info block */}
        <View style={[styles.headerBlock, { backgroundColor: colors.card }]}>
          <View style={styles.titleRow}>
            {g.avatarImageUrl ? (
              <Image source={{ uri: getImageUrl(g.avatarImageUrl) }} style={styles.avatarThumb} contentFit="cover" />
            ) : null}
            <Text style={[styles.name, { color: colors.foreground, flex: 1 }]}>{g.name}</Text>
            {g.certified ? <CertifiedBadge compact /> : null}
          </View>
          <View style={styles.rowGap}>
            <MapPin size={13} color={colors.mutedForeground} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>{g.neighborhood} · {g.address}</Text>
          </View>
          <StarRating rating={g.averageRating} reviewCount={g.reviewCount} size={15} />
          {g.emergencyAvailable ? (
            <View style={[styles.urgenceBadge, { backgroundColor: colors.destructive + "15" }]}>
              <Zap size={12} color={colors.destructive} />
              <Text style={[styles.urgenceText, { color: colors.destructive }]}>Disponible 24h/24 pour urgences</Text>
            </View>
          ) : null}

          {/* CTA buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleContact}
              style={[styles.primaryAction, { backgroundColor: colors.primary }, isOwnGarage && { opacity: 0.4 }]}
            >
              <MessageCircle size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Contacter</Text>
            </Pressable>
            {g.whatsapp ? (
              <Pressable
                onPress={() => Linking.openURL(`https://wa.me/${g.whatsapp!.replace(/\D/g, "")}`)}
                style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              >
                <Phone size={16} color={colors.foreground} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setShowMoreMenu(true)}
              style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.secondary }]}
            >
              <MoreVertical size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(["info", "avis", "galerie"] as TabKey[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              accessibilityLabel={t === "info" ? "Informations" : t === "avis" ? `Avis, ${g.reviewCount}` : "Galerie"}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: tab === t ? colors.primary : colors.mutedForeground,
                    fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {t === "info" ? "Informations" : t === "avis" ? `Avis (${g.reviewCount})` : "Galerie"}
              </Text>
              {tab === t ? <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          ))}
        </View>

        {/* Info tab */}
        {tab === "info" ? (
          <View style={styles.section}>
            {g.description ? (
              <Text style={[styles.description, { color: colors.foreground }]}>{g.description}</Text>
            ) : null}

            {/* Trust grid */}
            <View style={styles.trustGrid}>
              {[
                { label: "Qualité", value: g.trustQuality },
                { label: "Honnêteté", value: g.trustHonesty },
                { label: "Ponctualité", value: g.trustPunctuality },
                { label: "Rapport qualité/prix", value: g.trustValue },
              ].map((item) => (
                <View key={item.label} style={[styles.trustItem, { backgroundColor: colors.card }]}>
                  <Text style={[styles.trustValue, { color: colors.primary }]}>{item.value.toFixed(1)}</Text>
                  <Text style={[styles.trustLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.infoRow}>
              <Clock size={15} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Délai moyen : {repairDelayLabels[g.averageRepairDelay]}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Users size={15} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {g.mechanicsCount} mécaniciens · {g.yearsExperience} ans d'expérience
              </Text>
            </View>

            <Text style={[styles.subheading, { color: colors.foreground }]}>Spécialités</Text>
            <View style={styles.chipWrap}>
              {g.specialties.map((s) => (
                <View key={s} style={[styles.chip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.chipText, { color: colors.foreground }]}>{specialtyLabels[s] ?? s}</Text>
                </View>
              ))}
            </View>

            {g.acceptedBrands.length ? (
              <>
                <Text style={[styles.subheading, { color: colors.foreground }]}>Marques acceptées</Text>
                <Text style={[styles.description, { color: colors.mutedForeground }]}>{g.acceptedBrands.join(", ")}</Text>
              </>
            ) : null}

            {g.openingHours.length ? (
              <>
                <Text style={[styles.subheading, { color: colors.foreground }]}>Horaires</Text>
                <View style={[styles.hoursCard, { backgroundColor: colors.card }]}>
                  {g.openingHours.map((h, i) => (
                    <View key={h.day} style={[styles.hoursRow, i < g.openingHours.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5EA" }]}>
                      <Text style={[styles.hoursDay, { color: colors.foreground }]}>{dayLabels[h.day] ?? h.day}</Text>
                      <Text style={[styles.hoursTime, { color: h.closed ? colors.mutedForeground : colors.foreground }]}>
                        {h.closed ? "Fermé" : `${h.open} - ${h.close}`}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Avis tab */}
        {tab === "avis" ? (
          <View style={styles.section}>
            {isOwnGarage ? (
              <View style={[styles.selfBanner, { backgroundColor: colors.secondary, borderRadius: 14, marginBottom: 0 }]}>
                <Lock size={14} color={colors.mutedForeground} />
                <Text style={[styles.selfBannerText, { color: colors.mutedForeground }]}>
                  Vous ne pouvez pas laisser un avis sur votre propre garage.
                </Text>
              </View>
            ) : null}
            {!isOwnGarage && (isAuthenticated || isGuest) ? (
              showReviewForm ? (
                <View style={[styles.reviewForm, { backgroundColor: colors.card }]}>
                  <Text style={[styles.subheading, { color: colors.foreground, marginTop: 0 }]}>Votre note</Text>
                  <View style={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setReviewRating(n)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`${n} étoile${n > 1 ? "s" : ""}`}
                        accessibilityState={{ selected: n === reviewRating }}
                      >
                        <Star size={28} color={n <= reviewRating ? colors.accent : colors.border} />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Partagez votre expérience…"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    style={[styles.reviewInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  />
                  <View style={styles.reviewFormActions}>
                    <Pressable
                      onPress={() => setShowReviewForm(false)}
                      style={[styles.cancelButton, { backgroundColor: colors.secondary }]}
                      accessibilityRole="button"
                      accessibilityLabel="Annuler la rédaction de l'avis"
                    >
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSubmitReview}
                      disabled={createReview.isPending}
                      style={[styles.submitButton, { backgroundColor: colors.primary }]}
                      accessibilityRole="button"
                      accessibilityLabel="Publier l'avis"
                    >
                      <Text style={styles.submitButtonText}>{createReview.isPending ? "Envoi…" : "Publier"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    if (isGuest) {
                      router.push({ pathname: "/auth", params: { message: "Connectez-vous pour laisser un avis" } });
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                  style={[styles.addReviewButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Laisser un avis"
                >
                  <Pencil size={15} color={colors.primary} />
                  <Text style={[styles.addReviewText, { color: colors.primary }]}>Laisser un avis</Text>
                </Pressable>
              )
            ) : null}

            {(reviews.data ?? []).length === 0 ? (
              <EmptyState icon={Star} title="Aucun avis pour le moment" description="Soyez le premier à partager votre expérience." />
            ) : (
              (reviews.data ?? []).map((r) => (
                <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card }]}>
                  <View style={styles.reviewHeader}>
                    {r.userProfileImageUrl ? (
                      <Image source={{ uri: getImageUrl(r.userProfileImageUrl) }} style={styles.reviewAvatar} />
                    ) : (
                      <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder, { backgroundColor: colors.secondary }]}>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>{r.userName.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reviewName, { color: colors.foreground }]}>{r.userName}</Text>
                      <StarRating rating={r.rating} showValue={false} />
                    </View>
                  </View>
                  {r.comment ? <Text style={[styles.reviewComment, { color: colors.foreground }]}>{r.comment}</Text> : null}
                </View>
              ))
            )}
          </View>
        ) : null}

        {/* Galerie tab */}
        {tab === "galerie" ? (
          <View style={styles.section}>
            {photos.isLoading ? (
              <View style={styles.galleryCenter}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (photos.data ?? []).length === 0 ? (
              <EmptyState icon={ImageIcon} title="Aucune photo" description="Ce garage n'a pas encore ajouté de photos." />
            ) : (
              <View style={styles.galleryGrid}>
                {(photos.data ?? []).map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setLightboxUrl(p.url)}
                    style={[styles.galleryImageWrap, { backgroundColor: colors.secondary }]}
                  >
                    <Image source={{ uri: getImageUrl(p.url) }} style={styles.galleryImage} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>



      {/* Lightbox */}
      <Modal
        visible={lightboxUrl !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightboxUrl(null)}
      >
        <StatusBar backgroundColor="black" barStyle="light-content" />
        <View style={styles.lightboxBackdrop}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxUrl(null)}>
            <X size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.lightboxImageArea} onPress={() => setLightboxUrl(null)}>
            {lightboxUrl ? (
              <Image
                source={{ uri: getImageUrl(lightboxUrl) }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            ) : null}
          </Pressable>
        </View>
      </Modal>

      {/* More menu bottom sheet */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setShowMoreMenu(false)}>
          <View style={[styles.menuSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />
            <Pressable style={styles.menuItem} onPress={handleShare}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.secondary }]}>
                <Share2 size={18} color={colors.foreground} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Partager ce garage</Text>
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.menuItem} onPress={handleReport}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.destructive + "18" }]}>
                <Flag size={18} color={colors.destructive} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.destructive }]}>Signaler ce garage</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  selfBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selfBannerText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  coverWrap: { position: "relative" },
  cover: { width: "100%", height: 260 },
  coverGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  favoriteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBlock: {
    padding: 20,
    gap: 10,
    marginBottom: 2,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarThumb: { width: 44, height: 44, borderRadius: 22 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22 },
  rowGap: { flexDirection: "row", alignItems: "center", gap: 6 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13 },
  urgenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  urgenceText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
  },
  primaryActionText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  secondaryAction: {
    width: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  tabItem: { marginRight: 24, paddingBottom: 12, alignItems: "center", paddingTop: 14 },
  tabLabel: { fontSize: 14 },
  tabIndicator: { height: 2.5, width: "100%", marginTop: 10, borderRadius: 2 },
  section: { padding: 16, gap: 14 },
  description: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  trustGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  trustItem: {
    flexBasis: "47%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  trustValue: { fontFamily: "Inter_700Bold", fontSize: 22 },
  trustLabel: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  subheading: { fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  hoursCard: {
    borderRadius: 16,
    // overflow:"hidden" removed — rows have no backgroundColor so nothing clips beyond the card.
    // Keeping it here alongside elevation breaks Android child rendering.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", padding: 12 },
  hoursDay: { fontFamily: "Inter_500Medium", fontSize: 13 },
  hoursTime: { fontFamily: "Inter_400Regular", fontSize: 13 },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
  },
  addReviewText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reviewForm: { borderRadius: 18, padding: 16, gap: 12 },
  starPicker: { flexDirection: "row", gap: 8 },
  reviewInput: {
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlignVertical: "top",
  },
  reviewFormActions: { flexDirection: "row", gap: 10 },
  cancelButton: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitButton: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reviewCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19 },
  reviewAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  reviewName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  reviewComment: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  galleryImageWrap: { width: "31.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden" },
  galleryImage: { width: "100%", height: "100%" },
  galleryCenter: { alignItems: "center", paddingVertical: 48 },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImageArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
});
