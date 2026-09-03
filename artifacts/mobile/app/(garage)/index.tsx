/**
 * Dashboard Garage Pro — écran principal du mode Garage.
 * Respecte le thème clair/sombre via useG().
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import type { LucideIcon } from "lucide-react-native";
import { Pencil, ImageIcon, Wrench, Clock, Star, MessageCircle, Bell, User, Camera, Plus, Menu, X, ChevronRight, ChevronUp, ChevronDown } from "lucide-react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from "react-native-draggable-flatlist";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyGarage,
  useListGaragePhotos,
  useAddGaragePhoto,
  useDeleteGaragePhoto,
  useListConversations,
  useListNotifications,
  useUpdateGarage,
  getListTopRatedGaragesQueryKey,
  getListCertifiedGaragesQueryKey,
  getListGaragesQueryKey,
} from "@workspace/api-client-react";
import type { DayHours, Specialty } from "@workspace/api-client-react";
import { pickAndUploadImage, pickAndUploadMultipleImages } from "@/lib/uploadImage";
import { useAuth } from "@/lib/auth";
import { StarRating } from "@/components/StarRating";
import { specialtyLabels, specialtyOptions, dayLabels } from "@/constants/labels";
import { useG, type GarageTheme } from "./_layout";
import { getImageUrl } from "@/lib/imageUrl";
import { CongoPhoneInput } from "@/components/CongoPhoneInput";

const ALL_DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

// ── Primitives ────────────────────────────────────────────────────────────────

function SectionCard({
  G,
  icon,
  title,
  open,
  onToggle,
  isLink,
  badge,
  children,
}: {
  G: GarageTheme;
  icon: LucideIcon;
  title: string;
  open?: boolean;
  onToggle?: () => void;
  isLink?: boolean;
  badge?: number;
  children?: React.ReactNode;
}) {
  const s = useMemo(() => makeStyles(G), [G]);
  const Icon = icon;
  return (
    <View style={[s.sCard, isLink && { overflow: "hidden" }]}>
      <Pressable onPress={onToggle} style={s.sHeader} android_ripple={{ color: "rgba(128,128,128,0.1)" }}>
        <View style={s.sIconBox}>
          <Icon size={16} color={G.green} />
        </View>
        <Text style={s.sTitle}>{title}</Text>
        {badge != null && badge > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{badge}</Text>
          </View>
        ) : null}
        {isLink ? <ChevronRight size={18} color={G.muted} /> : open ? <ChevronUp size={18} color={G.muted} /> : <ChevronDown size={18} color={G.muted} />}
      </Pressable>
      {open && !isLink ? (
        <View style={s.sBody}>{children}</View>
      ) : null}
    </View>
  );
}

function StatCard({
  G,
  label,
  value,
  sub,
  delta,
  deltaPositive,
  star,
}: {
  G: GarageTheme;
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaPositive?: boolean;
  star?: boolean;
}) {
  const s = useMemo(() => makeStyles(G), [G]);
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
        <Text style={s.statValue}>{value}</Text>
        {star ? <Text style={{ fontSize: 18 }}>⭐</Text> : null}
        {sub ? <Text style={s.statSub}>{sub}</Text> : null}
      </View>
      {delta ? (
        <Text style={[s.delta, { color: deltaPositive !== false ? G.green : G.muted }]}>
          {delta}
        </Text>
      ) : null}
    </View>
  );
}

function SaveBtn({ G, onPress, pending }: { G: GarageTheme; onPress: () => void; pending: boolean }) {
  const s = useMemo(() => makeStyles(G), [G]);
  return (
    <Pressable onPress={onPress} style={s.saveBtn}>
      <Text style={s.saveBtnTxt}>{pending ? "Enregistrement…" : "Enregistrer"}</Text>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function GarageIndexScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const G = useG();
  const s = useMemo(() => makeStyles(G), [G]);

  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  const g = myGarage.data;

  const invalidateLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListTopRatedGaragesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListCertifiedGaragesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListGaragesQueryKey() });
  }, [queryClient]);

  const photos = useListGaragePhotos(g?.id ?? 0, { query: { enabled: !!g } as never });
  const conversations = useListConversations({ query: { enabled: isAuthenticated } as never });
  const notifications = useListNotifications({ target: "pro" }, { query: { enabled: isAuthenticated } as never });
  const updateGarage = useUpdateGarage();
  const addPhoto = useAddGaragePhoto();
  const deletePhoto = useDeleteGaragePhoto();

  const unread = (conversations.data ?? []).reduce((a, c) => a + (c.unreadCount ?? 0), 0);
  const unreadNotifs = (notifications.data ?? []).filter((n: any) => !n.read).length;

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (k: string) => setOpenSection((p) => (p === k ? null : k));

  type GP = { id: number; url: string };
  const [gallery, setGallery] = useState<GP[]>([]);
  useEffect(() => {
    if (photos.data) setGallery(photos.data.map((p) => ({ id: p.id, url: p.url })));
  }, [photos.data]);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specLoaded, setSpecLoaded] = useState(false);
  const [hours, setHours] = useState<DayHours[]>([]);
  const [hoursLoaded, setHoursLoaded] = useState(false);

  useEffect(() => {
    if (!g) return;
    if (!infoLoaded) {
      setName(g.name ?? "");
      setAddress(g.address ?? "");
      setNeighborhood(g.neighborhood ?? "");
      setPhone(g.phone ?? "");
      setWhatsapp(g.whatsapp ?? "");
      setDescription(g.description ?? "");
      setInfoLoaded(true);
    }
    if (!specLoaded) { setSpecialties(g.specialties ?? []); setSpecLoaded(true); }
    if (!hoursLoaded) {
      const merged = ALL_DAYS.map((day) => {
        const found = (g.openingHours ?? []).find((h) => h.day === day);
        return found ?? { day, open: "08:00", close: "18:00", closed: false };
      });
      setHours(merged);
      setHoursLoaded(true);
    }
  }, [g]);

  const saveInfo = () => {
    if (!g) return;
    updateGarage.mutate(
      { garageId: g.id, data: { name, address, neighborhood, phone, whatsapp, description } },
      {
        onSuccess: () => { myGarage.refetch(); invalidateLists(); Alert.alert("Succès", "Informations mises à jour !"); },
        onError: () => Alert.alert("Erreur", "Impossible de mettre à jour les informations."),
      },
    );
  };

  const saveSpecialties = () => {
    if (!g) return;
    updateGarage.mutate(
      { garageId: g.id, data: { specialties } },
      {
        onSuccess: () => { myGarage.refetch(); invalidateLists(); Alert.alert("Succès", "Spécialités mises à jour !"); },
        onError: () => Alert.alert("Erreur", "Impossible de mettre à jour les spécialités."),
      },
    );
  };

  const saveHours = () => {
    if (!g) return;
    updateGarage.mutate(
      { garageId: g.id, data: { openingHours: hours } },
      {
        onSuccess: () => { myGarage.refetch(); invalidateLists(); Alert.alert("Succès", "Horaires mis à jour !"); },
        onError: () => Alert.alert("Erreur", "Impossible de mettre à jour les horaires."),
      },
    );
  };

  if (myGarage.isLoading || !g) {
    return (
      <View style={[s.center, { backgroundColor: G.bg }]}>
        <ActivityIndicator color={G.green} />
      </View>
    );
  }

  const rating = g.reviewCount > 0 ? (g.averageRating ?? 0).toFixed(1) : "—";
  const totalConvs = (conversations.data ?? []).length;

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* ── Custom header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerBtn} />
        <Text style={s.headerTitle}>Dashboard Garage</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/notifications", params: { mode: "pro" } })}
          hitSlop={12}
          style={s.headerBtn}
        >
          <Bell size={22} color="#FFFFFF" />
          {unreadNotifs > 0 ? (
            <View style={s.notifDot}>
              <Text style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_700Bold" }}>
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[s.container, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome card ── */}
        <View style={s.welcomeCard}>
          <Text style={s.welcomeHello}>Bonjour,</Text>
          <Text style={s.welcomeName}>{g.name}{Platform.OS !== 'android' ? ' 👋' : ''}</Text>
          <Text style={s.welcomeSub}>Voici un aperçu de votre activité.</Text>
        </View>

        {/* ── Stats 2×2 ── */}
        <View style={s.statsGrid}>
          <StatCard G={G} label="Vues du profil" value="—" />
          <StatCard
            G={G}
            label="Note moyenne"
            value={rating}
            sub={g.reviewCount > 0 ? `(${g.reviewCount} avis)` : undefined}
            star={g.reviewCount > 0}
          />
          <StatCard G={G} label="Demandes de devis" value={String(totalConvs)} />
          <StatCard G={G} label="Rendez-vous" value="—" />
        </View>

        {/* ── Section accordions ── */}
        <SectionCard G={G} icon={Pencil} title="Informations" open={openSection === "info"} onToggle={() => toggle("info")}>
          {[
            { label: "Nom du garage", value: name, onChange: setName },
            { label: "Quartier", value: neighborhood, onChange: setNeighborhood },
            { label: "Adresse", value: address, onChange: setAddress },
          ].map(({ label, value, onChange }) => (
            <View key={label} style={{ gap: 5 }}>
              <Text style={s.fieldLabel}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                style={s.input}
                placeholderTextColor={G.muted}
              />
            </View>
          ))}
          <CongoPhoneInput
            value={phone}
            onChangeText={setPhone}
            label="Téléphone"
          />
          <CongoPhoneInput
            value={whatsapp}
            onChangeText={setWhatsapp}
            label="WhatsApp"
          />
          <View style={{ gap: 5 }}>
            <Text style={s.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
              placeholderTextColor={G.muted}
            />
          </View>
          <SaveBtn G={G} onPress={saveInfo} pending={updateGarage.isPending} />
        </SectionCard>

        <SectionCard G={G} icon={ImageIcon} title="Photos" open={openSection === "photos"} onToggle={() => toggle("photos")}>
          {photos.isLoading ? (
            <ActivityIndicator color={G.green} style={{ margin: 16 }} />
          ) : (
            <>
              <Text style={s.photoLabel}>Logo & Bannière</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {/* Logo */}
                <Pressable
                  onPress={async () => {
                    const url = await pickAndUploadImage({ allowsEditing: true, aspect: [1, 1] });
                    if (!url) return;
                    updateGarage.mutate({ garageId: g.id, data: { avatarImageUrl: url } }, { onSuccess: () => { myGarage.refetch(); invalidateLists(); } });
                  }}
                  style={s.photoWrap}
                >
                  {g.avatarImageUrl ? (
                    <Image source={{ uri: getImageUrl(g.avatarImageUrl) }} style={s.photoThumb} contentFit="cover" />
                  ) : (
                    <View style={[s.photoThumb, s.photoEmpty]}>
                      <User size={22} color={G.muted} />
                    </View>
                  )}
                  <View style={s.photoEditBadge}><Camera size={11} color="#fff" /></View>
                  <Text style={s.photoCaption}>Logo</Text>
                </Pressable>

                {/* Bannière */}
                <Pressable
                  onPress={async () => {
                    const url = await pickAndUploadImage({ allowsEditing: true, aspect: [16, 9] });
                    if (!url) return;
                    updateGarage.mutate({ garageId: g.id, data: { coverImageUrl: url } }, { onSuccess: () => { myGarage.refetch(); invalidateLists(); } });
                  }}
                  style={s.photoWrap}
                >
                  {g.coverImageUrl ? (
                    <Image source={{ uri: getImageUrl(g.coverImageUrl) }} style={[s.photoThumb, { width: 140 }]} contentFit="cover" />
                  ) : (
                    <View style={[s.photoThumb, s.photoEmpty, { width: 140 }]}>
                      <ImageIcon size={22} color={G.muted} />
                    </View>
                  )}
                  <View style={s.photoEditBadge}><Camera size={11} color="#fff" /></View>
                  <Text style={s.photoCaption}>Bannière</Text>
                </Pressable>
              </View>

              {/* Galerie */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={s.photoLabel}>Galerie {gallery.length > 0 ? "— maintenez pour réorganiser" : ""}</Text>
                <Pressable
                  onPress={async () => {
                    const urls = await pickAndUploadMultipleImages();
                    if (!urls.length) return;
                    for (const url of urls) {
                      await new Promise<void>((res) =>
                        addPhoto.mutate({ garageId: g.id, data: { url } }, { onSuccess: () => res(), onError: () => res() }),
                      );
                    }
                    photos.refetch(); invalidateLists();
                  }}
                  style={s.addBtn}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={s.addBtnTxt}>Ajouter</Text>
                </Pressable>
              </View>

              {gallery.length > 0 ? (
                <DraggableFlatList
                  data={gallery}
                  keyExtractor={(item) => String(item.id)}
                  onDragEnd={({ data }) => setGallery(data)}
                  horizontal
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  renderItem={({ item, drag, isActive }: RenderItemParams<GP>) => (
                    <ScaleDecorator>
                      <Pressable onLongPress={drag} disabled={isActive} style={[s.photoWrap, isActive && { opacity: 0.8 }]}>
                        <Image source={{ uri: getImageUrl(item.url) }} style={s.photoThumb} contentFit="cover" />
                        <View style={s.dragHandle}><Menu size={11} color="#fff" /></View>
                        <Pressable
                          onPress={() =>
                            Alert.alert("Supprimer ?", "", [
                              { text: "Annuler", style: "cancel" },
                              { text: "Supprimer", style: "destructive", onPress: () => deletePhoto.mutate({ garageId: g.id, photoId: item.id }, { onSuccess: () => photos.refetch() }) },
                            ])
                          }
                          style={s.photoDeleteBtn}
                        >
                          <X size={11} color="#fff" />
                        </Pressable>
                      </Pressable>
                    </ScaleDecorator>
                  )}
                />
              ) : (
                <Text style={s.emptyNote}>Aucune photo dans la galerie pour l'instant.</Text>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard G={G} icon={Wrench} title="Spécialités & services" open={openSection === "spec"} onToggle={() => toggle("spec")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {specialtyOptions.map((sp) => {
              const active = specialties.includes(sp);
              return (
                <Pressable
                  key={sp}
                  onPress={() => setSpecialties((p) => p.includes(sp) ? p.filter((x) => x !== sp) : [...p, sp])}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text style={[s.chipTxt, active && { color: "#fff" }]}>{specialtyLabels[sp]}</Text>
                </Pressable>
              );
            })}
          </View>
          <SaveBtn G={G} onPress={saveSpecialties} pending={updateGarage.isPending} />
        </SectionCard>

        <SectionCard G={G} icon={Clock} title="Horaires" open={openSection === "hours"} onToggle={() => toggle("hours")}>
          {hours.map((h) => (
            <View key={h.day} style={s.dayRow}>
              <Text style={[s.dayName, { width: 90 }]}>{dayLabels[h.day] ?? h.day}</Text>
              <Switch
                value={!h.closed}
                onValueChange={(v) => setHours((p) => p.map((x) => x.day === h.day ? { ...x, closed: !v } : x))}
                trackColor={{ true: G.green, false: G.border }}
                thumbColor={G.text}
              />
              {!h.closed ? (
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TextInput
                    value={h.open}
                    onChangeText={(v) => setHours((p) => p.map((x) => x.day === h.day ? { ...x, open: v } : x))}
                    style={s.timeInput}
                    placeholder="08:00"
                    placeholderTextColor={G.muted}
                  />
                  <Text style={{ color: G.muted, fontFamily: "Inter_400Regular" }}>—</Text>
                  <TextInput
                    value={h.close}
                    onChangeText={(v) => setHours((p) => p.map((x) => x.day === h.day ? { ...x, close: v } : x))}
                    style={s.timeInput}
                    placeholder="18:00"
                    placeholderTextColor={G.muted}
                  />
                </View>
              ) : (
                <Text style={{ flex: 1, textAlign: "right", color: G.muted, fontFamily: "Inter_400Regular", fontSize: 13 }}>Fermé</Text>
              )}
            </View>
          ))}
          <SaveBtn G={G} onPress={saveHours} pending={updateGarage.isPending} />
        </SectionCard>

        <SectionCard
          G={G}
          icon={Star}
          title={`Avis reçus (${g.reviewCount})`}
          open={openSection === "reviews"}
          onToggle={() => toggle("reviews")}
        >
          <Pressable onPress={() => router.push("/(garage)/reviews")} style={s.saveBtn}>
            <Text style={s.saveBtnTxt}>Voir tous les avis</Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          G={G}
          icon={MessageCircle}
          title="Consulter les messages"
          isLink
          badge={unread}
          onToggle={() => router.push("/(garage)/messages")}
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

// ── Style factory ─────────────────────────────────────────────────────────────
function makeStyles(G: GarageTheme) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: G.green,
      borderBottomWidth: 0,
    },
    headerBtn: { width: 36, alignItems: "center", justifyContent: "center", position: "relative" },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      color: "#FFFFFF",
    },
    notifDot: {
      position: "absolute",
      top: -2,
      right: -4,
      backgroundColor: G.red,
      borderRadius: 8,
      minWidth: 14,
      height: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 2,
    },

    container: { padding: 16, gap: 12 },

    welcomeCard: {
      backgroundColor: G.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
    },
    welcomeHello: { fontFamily: "Inter_400Regular", fontSize: 16, color: G.sub },
    welcomeName: { fontFamily: "Inter_700Bold", fontSize: 24, color: G.text, marginTop: 2 },
    welcomeSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: G.muted, marginTop: 6 },

    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    statCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: G.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
      padding: 16,
    },
    statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: G.muted },
    statValue: { fontFamily: "Inter_700Bold", fontSize: 28, color: G.text },
    statSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: G.muted, flexShrink: 1 },
    delta: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 4 },

    sCard: {
      backgroundColor: G.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
      overflow: "hidden",
    },
    sHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    sIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: G.greenBg,
      alignItems: "center",
      justifyContent: "center",
    },
    sTitle: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, color: G.text },
    sBody: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: G.border,
      paddingTop: 12,
    },
    badge: {
      backgroundColor: G.red,
      borderRadius: 8,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeTxt: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },

    fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: G.muted },
    input: {
      backgroundColor: G.card2,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: G.text,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
    },
    saveBtn: {
      backgroundColor: G.green,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 4,
    },
    saveBtnTxt: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

    photoLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: G.muted, marginBottom: 6 },
    photoWrap: { alignItems: "center", gap: 4, position: "relative" },
    photoThumb: { width: 90, height: 80, borderRadius: 10, backgroundColor: G.card2 },
    photoEmpty: { alignItems: "center", justifyContent: "center" },
    photoCaption: { fontFamily: "Inter_400Regular", fontSize: 11, color: G.muted },
    photoEditBadge: {
      position: "absolute", top: 5, right: 5,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center", justifyContent: "center",
    },
    dragHandle: {
      position: "absolute", top: 5, left: 5,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center", justifyContent: "center",
    },
    photoDeleteBtn: {
      position: "absolute", top: 5, right: 5,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: "rgba(200,0,0,0.8)",
      alignItems: "center", justifyContent: "center",
    },
    addBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: G.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    addBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
    emptyNote: { fontFamily: "Inter_400Regular", fontSize: 13, color: G.muted, textAlign: "center", paddingVertical: 8 },

    chip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
      borderWidth: 1, borderColor: G.border, backgroundColor: G.card2,
    },
    chipActive: { backgroundColor: G.green, borderColor: G.green },
    chipTxt: { fontFamily: "Inter_500Medium", fontSize: 12, color: G.sub },

    dayRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: G.border,
    },
    dayName: { fontFamily: "Inter_500Medium", fontSize: 13, color: G.text },
    timeInput: {
      flex: 1, backgroundColor: G.card2, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 7,
      fontFamily: "Inter_400Regular", fontSize: 13,
      color: G.text, textAlign: "center",
      borderWidth: StyleSheet.hairlineWidth, borderColor: G.border,
    },
  });
}
