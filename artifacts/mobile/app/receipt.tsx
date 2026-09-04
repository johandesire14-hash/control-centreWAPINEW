/**
 * ReceiptScreen — Post-Paiement Client
 * Reçu de paiement + Carnet d'Entretien + Modal d'Avis Certifié
 */
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ClipboardList,
  Share2,
  Shield,
  Star,
  Wrench,
} from "lucide-react-native";

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTH_TOKEN_KEY = "auth_session_token";
const BG = "#060F0B";
const CARD_DARK = "#0D1F16";
const GREEN = "#22C55E";
const GREEN_PRIMARY = "#1D7159";
const GREEN_MED = "#34a17a";
const GOLD = "#F4B400";
const BORDER_DARK = "rgba(52,161,122,0.22)";

const RATING_LABELS: Record<number, string> = {
  1: "Très mauvais",
  2: "Mauvais",
  3: "Correct",
  4: "Très bien",
  5: "Excellent !",
};

const TAGS = ["Prix transparent", "Rapidité", "Bon accueil", "Travail propre"];

const a = Platform.OS === "android" ? { includeFontPadding: false } : {};

function getApiBase() {
  return (process.env.EXPO_PUBLIC_API_DOMAIN || "")
    ? `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "")}`
    : "";
}

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date().toLocaleDateString("fr-FR");
  }
}

function shortRef(id: string): string {
  const clean = id.replace("INV-", "");
  return "WG-" + (clean.length > 8 ? clean.slice(-8) : clean);
}

// ── Star Row ──────────────────────────────────────────────────────────────────

function StarRow({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => {
            onChange(i);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          hitSlop={8}
        >
          <Star
            size={36}
            color={GOLD}
            fill={i <= rating ? GOLD : "transparent"}
            strokeWidth={1.6}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ── Tag Pill ──────────────────────────────────────────────────────────────────

function TagPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        onPress();
        Haptics.selectionAsync();
      }}
      style={[
        S.tagPill,
        selected && S.tagPillSelected,
      ]}
    >
      <Text style={[S.tagText, selected && S.tagTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// ── Leave Review Modal ────────────────────────────────────────────────────────

function LeaveReviewModal({
  visible,
  garageName,
  garageId,
  invoiceId,
  onClose,
}: {
  visible: boolean;
  garageName: string;
  garageId: number | null;
  invoiceId: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(60)).current;
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      setReviewError("");
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(60);
    }
  }, [visible, slideAnim]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!garageId || submitting) return;
    setSubmitting(true);
    setReviewError("");
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const tagComment =
        selectedTags.size > 0
          ? `[${[...selectedTags].join(", ")}]${comment.trim() ? " — " + comment.trim() : ""}`
          : comment.trim() || undefined;

      const res = await fetch(
        `${getApiBase()}/api/garages/${garageId}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            rating,
            comment: tagComment,
            qualityRating: rating,
            honestyRating: rating,
            punctualityRating: rating,
            valueRating: rating,
            invoiceId,
          }),
        },
      );

      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Erreur ${res.status}`);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        router.replace("/(tabs)/account");
      }, 2000);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <View style={S.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <Animated.View
            style={[
              S.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom + 16, 32),
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Handle */}
            <View style={S.handle} />

            {/* Close */}
            <Pressable onPress={onClose} style={S.closeBtn} hitSlop={12}>
              <Text style={{ fontSize: 20, color: "rgba(255,255,255,0.4)" }}>✕</Text>
            </Pressable>

            {submitted ? (
              /* ── Success state ── */
              <View style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
                <CheckCircle size={64} color={GREEN} />
                <Text style={S.submittedTitle}>Avis publié !</Text>
                <Text style={S.submittedSub}>
                  Merci pour votre retour sur {garageName}.
                </Text>
                <ActivityIndicator size="small" color={GREEN_MED} style={{ marginTop: 8 }} />
              </View>
            ) : (
              <KeyboardAwareScrollViewCompat
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Verified badge */}
                <View style={S.verifiedBadge}>
                  <Shield size={16} color={GREEN} />
                  <Text style={S.verifiedText}>Avis Vérifié</Text>
                  <View style={S.verifiedDot} />
                  <Text style={S.verifiedSub}>Lié à une facture réellement payée</Text>
                </View>

                {/* Garage name */}
                <View style={{ gap: 4 }}>
                  <Text style={S.reviewGarage} numberOfLines={1}>{garageName}</Text>
                  <Text style={S.reviewPrompt}>Comment évaluez-vous votre expérience ?</Text>
                </View>

                {/* Stars */}
                <View style={{ alignItems: "center", gap: 10 }}>
                  <StarRow rating={rating} onChange={setRating} />
                  <Text style={S.ratingLabel}>{RATING_LABELS[rating]}</Text>
                </View>

                {/* Tags */}
                <View style={{ gap: 10 }}>
                  <Text style={S.sectionLabel}>POINTS FORTS</Text>
                  <View style={S.tagsRow}>
                    {TAGS.map((tag) => (
                      <TagPill
                        key={tag}
                        label={tag}
                        selected={selectedTags.has(tag)}
                        onPress={() => toggleTag(tag)}
                      />
                    ))}
                  </View>
                </View>

                {/* Comment */}
                <View style={{ gap: 8 }}>
                  <Text style={S.sectionLabel}>COMMENTAIRE (OPTIONNEL)</Text>
                  <TextInput
                    style={S.commentInput}
                    placeholder="Laissez un commentaire sur votre expérience..."
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    returnKeyType="done"
                  />
                </View>

                {/* Error */}
                {reviewError ? (
                  <Text style={S.errorText}>{reviewError}</Text>
                ) : null}

                {/* Submit */}
                <Pressable
                  onPress={garageId && invoiceId ? handleSubmit : undefined}
                  style={({ pressed }) => [
                    S.submitBtn,
                    (!garageId || !invoiceId) && { opacity: 0.38 },
                    pressed && !!garageId && !!invoiceId && { opacity: 0.88 },
                    submitting && { opacity: 0.6 },
                  ]}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Star size={16} color="#060F0B" fill="#060F0B" />
                      <Text style={S.submitBtnText}>Publier mon avis</Text>
                    </>
                  )}
                </Pressable>

                {!garageId && (
                  <Text style={[S.errorText, { textAlign: "center", fontSize: 12 }]}>
                    L'identifiant du garage est requis pour publier un avis.
                  </Text>
                )}

                <Pressable onPress={onClose} style={S.cancelLink}>
                  <Text style={S.cancelText}>Plus tard</Text>
                </Pressable>
              </KeyboardAwareScrollViewCompat>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ReceiptScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    garage: string;
    garageId: string;
    invoiceId?: string;
    description: string;
    amount: string;
    externalId: string;
    paidAt: string;
  }>();

  const garage = params.garage ?? "Garage";
  const garageId = params.garageId ? Number(params.garageId) : null;
  const invoiceId = params.invoiceId ?? "";
  const description = params.description ?? "";
  const amount = params.amount ? Number(params.amount) : 0;
  const externalId = params.externalId ?? "";
  const paidAt = params.paidAt ?? new Date().toISOString();

  const [showReview, setShowReview] = useState(false);

  // Auto-open review modal after delay
  useEffect(() => {
    const t = setTimeout(() => setShowReview(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          `🧾 Reçu WapiGarage\n\n` +
          `Garage : ${garage}\n` +
          `Service : ${description}\n` +
          `Montant : ${formatFCFA(amount)}\n` +
          `Réf : ${shortRef(externalId)}\n` +
          `Date : ${formatDate(paidAt)}\n` +
          `Statut : PAYÉ ✅\n\n` +
          `Payé via WapiGarage — wapi.app`,
        title: `Reçu ${garage}`,
      });
    } catch {}
  };

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={S.topBar}>
        <Pressable onPress={() => router.back()} style={S.backBtn} hitSlop={12}>
          <ChevronLeft size={24} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <Text style={S.topBarTitle}>Reçu de paiement</Text>
        <Pressable onPress={handleShare} style={S.shareBtn} hitSlop={12}>
          <Share2 size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Receipt Paper Card ── */}
        <View style={S.paperCard}>
          {/* Top: logo + brand */}
          <View style={S.paperHeader}>
            <View style={S.paperLogo}>
              <Wrench size={18} color={GREEN_PRIMARY} />
            </View>
            <View>
              <Text style={S.paperBrand}>WAPI GARAGE</Text>
              <Text style={S.paperSubBrand}>Reçu officiel</Text>
            </View>
            <View style={S.paidBadge}>
              <Text style={S.paidText}>PAYÉ ✅</Text>
            </View>
          </View>

          {/* Dashed separator */}
          <View style={S.dashedLine} />

          {/* Garage + Meta */}
          <View style={S.paperMeta}>
            <Text style={S.metaGarage}>{garage}</Text>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Date</Text>
              <Text style={S.metaValue}>{formatDate(paidAt)}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Référence</Text>
              <Text style={[S.metaValue, S.refText]}>{shortRef(externalId)}</Text>
            </View>
          </View>

          {/* Dashed separator */}
          <View style={S.dashedLine} />

          {/* Service details */}
          <View style={S.paperServices}>
            <Text style={S.servicesLabel}>PRESTATIONS</Text>
            <Text style={S.servicesDesc}>{description}</Text>
          </View>

          {/* Dashed separator */}
          <View style={S.dashedLine} />

          {/* Total */}
          <View style={S.paperTotal}>
            <Text style={S.totalLabel}>MONTANT TOTAL</Text>
            <Text style={S.totalAmount}>{formatFCFA(amount)}</Text>
          </View>

          {/* Share row */}
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [S.shareRow, pressed && { opacity: 0.7 }]}
          >
            <Share2 size={14} color={GREEN_PRIMARY} />
            <Text style={S.shareRowText}>Télécharger / Partager le reçu</Text>
          </Pressable>
        </View>

        {/* ── Carnet d'Entretien ── */}
        <View style={S.logbookCard}>
          <View style={S.logbookHeader}>
            <BookOpen size={20} color={GREEN} />
            <Text style={S.logbookTitle}>Carnet d'Entretien</Text>
            <View style={S.logbookBadge}>
              <CheckCircle size={12} color={GREEN} />
              <Text style={S.logbookBadgeText}>Enregistré</Text>
            </View>
          </View>

          <View style={S.logbookBody}>
            <View style={S.logbookRow}>
              <View style={S.logbookDot} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={S.logbookService} numberOfLines={2}>{description}</Text>
                <Text style={S.logbookMeta}>{garage} · {formatDate(paidAt)}</Text>
              </View>
            </View>

            <View style={S.logbookHint}>
              <ClipboardList size={13} color={GREEN_MED} />
              <Text style={S.logbookHintText}>
                Cette prestation a été ajoutée à votre historique d'entretien.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Leave review CTA ── */}
        {garageId ? (
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => setShowReview(true)}
              style={({ pressed }) => [S.reviewCta, pressed && { opacity: 0.88 }]}
            >
              <Star size={18} color="#060F0B" fill="#060F0B" />
              <Text style={S.reviewCtaText}>
                Laisser un avis sur {garage}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/(tabs)/account")}
              style={S.skipLink}
            >
              <Text style={S.skipText}>Retour à mon espace</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.replace("/(tabs)/account")}
            style={S.reviewCta}
          >
            <Text style={S.reviewCtaText}>Retour à mon espace</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Leave Review Modal ── */}
      <LeaveReviewModal
        visible={showReview}
        garageName={garage}
        garageId={garageId}
        invoiceId={invoiceId}
        onClose={() => setShowReview(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_DARK,
  },
  backBtn: { padding: 4 },
  shareBtn: { padding: 4 },
  topBarTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    ...a,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },

  // Paper card (receipt)
  paperCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  paperHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  paperLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F8F5",
    alignItems: "center",
    justifyContent: "center",
  },
  paperBrand: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#1C1C1E",
    letterSpacing: 0.5,
    ...a,
  },
  paperSubBrand: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#8E8E93",
    ...a,
  },
  paidBadge: {
    marginLeft: "auto",
    backgroundColor: "#F0FFF6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  paidText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#15803D",
    ...a,
  },

  dashedLine: {
    marginHorizontal: 20,
    borderStyle: "dashed",
    borderTopWidth: 1,
    borderColor: "#E5E5EA",
  },

  paperMeta: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  metaGarage: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#1C1C1E",
    marginBottom: 4,
    ...a,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8E8E93",
    ...a,
  },
  metaValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#1C1C1E",
    ...a,
  },
  refText: {
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },

  paperServices: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  servicesLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#8E8E93",
    ...a,
  },
  servicesDesc: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "#1C1C1E",
    lineHeight: 22,
    ...a,
  },

  paperTotal: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 4,
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.4,
    color: "#8E8E93",
    ...a,
  },
  totalAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 42,
    color: "#1C1C1E",
    ...a,
  },

  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  shareRowText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: GREEN_PRIMARY,
    ...a,
  },

  // Logbook card
  logbookCard: {
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_DARK,
    overflow: "hidden",
  },
  logbookHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_DARK,
  },
  logbookTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
    flex: 1,
    ...a,
  },
  logbookBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34,197,94,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  logbookBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GREEN,
    ...a,
  },
  logbookBody: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  logbookRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  logbookDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN_MED,
    marginTop: 5,
  },
  logbookService: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 21,
    ...a,
  },
  logbookMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    ...a,
  },
  logbookHint: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(52,161,122,0.08)",
    borderRadius: 10,
    padding: 12,
  },
  logbookHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
    flex: 1,
    ...a,
  },

  // Review CTA
  reviewCta: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  reviewCtaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#060F0B",
    ...a,
  },
  skipLink: { alignItems: "center", paddingVertical: 10 },
  skipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
    ...a,
  },

  // Review modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  modalSheet: {
    backgroundColor: "#111C15",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    padding: 10,
    zIndex: 10,
  },

  // Verified badge
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  verifiedText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: GREEN,
    ...a,
  },
  verifiedDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(34,197,94,0.5)",
  },
  verifiedSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    ...a,
  },

  reviewGarage: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    ...a,
  },
  reviewPrompt: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    ...a,
  },

  ratingLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: GOLD,
    ...a,
  },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.4)",
    ...a,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  tagPill: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(52,161,122,0.4)",
    backgroundColor: "transparent",
  },
  tagPillSelected: {
    backgroundColor: GREEN_PRIMARY,
    borderColor: GREEN_PRIMARY,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: GREEN_MED,
    ...a,
  },
  tagTextSelected: {
    color: "#FFFFFF",
  },

  commentInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 100,
  },

  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#FF453A",
    ...a,
  },

  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  submitBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#060F0B",
    ...a,
  },

  cancelLink: { alignItems: "center", paddingVertical: 6 },
  cancelText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.35)",
    ...a,
  },

  // Submitted
  submittedTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: GREEN,
    ...a,
  },
  submittedSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    ...a,
  },
});
