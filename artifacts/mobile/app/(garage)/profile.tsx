/**
 * Onglet Profil de l'interface Garage Pro.
 * Respecte le thème clair/sombre via useG().
 */
import React, { useMemo, useState } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import type { LucideIcon } from "lucide-react-native";
import { User, Eye, Shield, Bell, Settings, LogOut, ChevronRight, Wrench, Images, CreditCard } from "lucide-react-native";
import { PaymentMethodModal } from "@/components/PaymentMethodModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetMyGarage, useGetMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useG, type GarageTheme } from "./_layout";

function MenuItem({
  G,
  icon,
  label,
  onPress,
  danger,
  sub,
}: {
  G: GarageTheme;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
  sub?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 13,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: G.border,
      }}
      android_ripple={{ color: "rgba(128,128,128,0.1)" }}
    >
      <View style={{
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: danger ? "rgba(217,72,58,0.12)" : G.greenBg,
        alignItems: "center", justifyContent: "center",
      }}>
        {(() => { const Icon = icon; return <Icon size={17} color={danger ? G.red : G.green} />; })()}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: danger ? G.red : G.text }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: G.muted }}>{sub}</Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={G.muted} />
    </Pressable>
  );
}

export default function GarageProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, logout } = useAuth();
  const G = useG();
  const s = useMemo(() => makeStyles(G), [G]);

  const profile = useGetMyProfile({ query: { enabled: isAuthenticated } as never });
  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  const g = myGarage.data;
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert("Se déconnecter ?", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: () => { logout(); router.replace("/auth"); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 20,
        backgroundColor: G.green,
      }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: "#FFFFFF" }}>Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Garage identity card */}
        {myGarage.isLoading ? (
          <ActivityIndicator color={G.green} style={{ marginVertical: 20 }} />
        ) : g ? (
          <View style={s.garageCard}>
            {g.avatarImageUrl ? (
              <Image source={{ uri: getImageUrl(g.avatarImageUrl) }} style={s.garageAvatar} contentFit="cover" />
            ) : (
              <View style={[s.garageAvatar, { backgroundColor: G.card2, alignItems: "center", justifyContent: "center" }]}>
                <Wrench size={28} color={G.green} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: G.text }}>{g.name}</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: G.muted }}>
                {g.neighborhood ?? g.address}
              </Text>
              {g.certified ? (
                <View style={s.certBadge}>
                  <Shield size={11} color={G.green} />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: G.green }}>Certifié</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Account info */}
        <View style={{ gap: 8 }}>
          <Text style={s.sectionTitle}>Compte</Text>
          <View style={s.card}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Nom</Text>
              <Text style={s.infoValue}>
                {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "—"}
              </Text>
            </View>
            <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue} numberOfLines={1}>{user?.email ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* Switch to client mode */}
        <View style={{ gap: 8 }}>
          <Text style={s.sectionTitle}>Mode</Text>
          <View style={s.card}>
            <MenuItem
              G={G}
              icon={User}
              label="👤 Revenir en mode Client"
              sub="Basculer vers l'interface Client"
              onPress={async () => {
                await AsyncStorage.setItem("user_active_mode", "CLIENT");
                router.replace("/(tabs)");
              }}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={{ gap: 8 }}>
          <Text style={s.sectionTitle}>Gestion</Text>
          <View style={s.card}>
            <MenuItem
              G={G}
              icon={Eye}
              label="Aperçu de la fiche"
              sub="Voir votre page publique"
              onPress={() => g && router.push({ pathname: "/garage/[id]", params: { id: g.id, preview: "true" } })}
            />
            <MenuItem
              G={G}
              icon={Images}
              label="Galerie photos"
              sub="Ajouter et gérer vos photos"
              onPress={() => router.push("/(garage)/photos")}
            />
            {g && !g.certified ? (
              <MenuItem
                G={G}
                icon={Shield}
                label="Demande de certification"
                onPress={() => router.push("/certification")}
              />
            ) : null}
            <MenuItem G={G} icon={CreditCard} label="Moyens de paiement" sub="Compte Mobile Money pour les virements" onPress={() => setPaymentModalVisible(true)} />
            <MenuItem G={G} icon={Bell} label="Notifications" onPress={() => router.push({ pathname: "/notifications", params: { mode: "pro" } })} />
            <MenuItem G={G} icon={Settings} label="Paramètres" onPress={() => router.push("/settings")} />
          </View>
        </View>

        {/* Danger */}
        <View style={{ gap: 8 }}>
          <View style={s.card}>
            <MenuItem G={G} icon={LogOut} label="Se déconnecter" onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>

      <PaymentMethodModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={(phoneInternational) => {
          setPaymentModalVisible(false);
          Alert.alert("Numéro confirmé", `Numéro enregistré : +${phoneInternational}`);
        }}
        userType="PRO"
      />
    </View>
  );
}

function makeStyles(G: GarageTheme) {
  return StyleSheet.create({
    garageCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: G.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
      padding: 16,
    },
    garageAvatar: { width: 64, height: 64, borderRadius: 14 },
    certBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
      alignSelf: "flex-start",
      backgroundColor: G.greenBg,
      borderRadius: 100,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: G.muted,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: G.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: G.border,
      overflow: "hidden",
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: G.border,
    },
    infoLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: G.muted },
    infoValue: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      color: G.text,
      flex: 1,
      textAlign: "right",
    },
  });
}
