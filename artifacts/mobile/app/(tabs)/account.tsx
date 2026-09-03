import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProxyImage as Image } from "@/components/ProxyImage";
import type { LucideIcon } from "lucide-react-native";
import { User, Camera, Wrench, ChevronRight, Bell, Settings, Info, LogOut, Heart, CreditCard, ScanLine } from "lucide-react-native";
import { PaymentMethodModal } from "@/components/PaymentMethodModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetMyGarage,
  useGetMyProfile,
  useListMyFavorites,
  useListNotifications,
  useRemoveFavorite,
  useUpdateMyProfile,
} from "@workspace/api-client-react";
import { pickAndUploadImage } from "@/lib/uploadImage";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { GarageCard } from "@/components/GarageCard";
import { getImageUrl } from "@/lib/imageUrl";

function MenuRow({
  icon,
  label,
  onPress,
  badge,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
}) {
  const colors = useColors();
  const Icon = icon;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuRow, { backgroundColor: colors.card }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={danger ? "Déconnecte votre compte" : undefined}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.destructive + "15" : colors.secondary }]}>
        <Icon size={17} color={danger ? colors.destructive : colors.foreground} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      {typeof badge === "number" && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function MonEspaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading, logout, user } = useAuth();

  const profile = useGetMyProfile({ query: { enabled: isAuthenticated } as never });
  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated && !!profile.data?.hasGarage } as never });
  const favorites = useListMyFavorites({ query: { enabled: isAuthenticated } as never });
  const notifications = useListNotifications({ target: "client" }, { query: { enabled: isAuthenticated } as never });
  const updateProfile = useUpdateMyProfile();
  const removeFavorite = useRemoveFavorite();

  const unreadNotifications = (notifications.data ?? []).filter((n) => !n.read).length;
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const userType = profile.data?.hasGarage ? "PRO" : "CLIENT";

  const handleChangePhoto = async () => {
    const url = await pickAndUploadImage({ allowsEditing: true, aspect: [1, 1] });
    if (!url) return;
    updateProfile.mutate(
      { data: { profileImageUrl: url } },
      {
        onSuccess: () => profile.refetch(),
        onError: () => Alert.alert("Erreur", "Impossible de mettre à jour la photo."),
      },
    );
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: logout },
    ]);
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBlock, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
          <Text style={[styles.header, { color: "#FFFFFF" }]}>Mon Espace</Text>
        </View>
        <EmptyState
          icon={User}
          title="Connectez-vous à WapiGarage"
          description="Gérez vos favoris, vos messages et votre profil."
        />
        <View style={styles.authActions}>
          <Pressable onPress={() => router.push("/auth")} style={[styles.loginButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/about")} style={styles.footerLink}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>À propos de WapiGarage</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header fixe ── */}
      <View style={[styles.headerBlock, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.header, { color: "#FFFFFF" }]}>Mon Espace</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
      {/* ── Profile Card ── */}
      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <Pressable onPress={handleChangePhoto} style={{ position: "relative" }}>
          {(profile.data?.profileImageUrl ?? user?.profileImageUrl) ? (
            <Image source={{ uri: getImageUrl(profile.data?.profileImageUrl ?? user?.profileImageUrl) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}>
              <User size={30} color={colors.mutedForeground} />
            </View>
          )}
          <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
            {updateProfile.isPending ? (
              <ActivityIndicator size={10} color="#FFFFFF" />
            ) : (
              <Camera size={11} color="#FFFFFF" />
            )}
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {(profile.data?.firstName ?? user?.firstName)
              ? `${profile.data?.firstName ?? user?.firstName} ${profile.data?.lastName ?? user?.lastName ?? ""}`.trim()
              : "Utilisateur"}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>
      </View>

      {/* ── Garage Pro Banner ── */}
      {profile.data?.hasGarage ? (
        <Pressable
          onPress={async () => {
            await AsyncStorage.setItem("user_active_mode", "PRO");
            router.replace("/(garage)");
          }}
          style={[styles.dashboardCard, { backgroundColor: "#1D7159" }]}
        >
          <View style={[styles.dashboardIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Wrench size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardTitle}>Passer en mode Pro</Text>
            <Text style={styles.dashboardSubtitle}>
              {myGarage.data?.name ?? "Accéder à votre tableau de bord"}
            </Text>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/onboarding/garage")}
          style={[styles.dashboardCard, { backgroundColor: "#1D7159" }]}
        >
          <View style={[styles.dashboardIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Wrench size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardTitle}>Devenir Garage Pro</Text>
            <Text style={styles.dashboardSubtitle}>Créez votre profil garage et gérez votre activité</Text>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      )}

      {/* ── Menu ── */}
      <View style={styles.menuGroup}>
        <MenuRow icon={ScanLine} label="Scanner QR de paiement" onPress={() => router.push("/(tabs)/pay")} />
        <MenuRow icon={Bell} label="Notifications" badge={unreadNotifications} onPress={() => router.push("/notifications")} />
        <MenuRow icon={CreditCard} label="Moyens de paiement" onPress={() => setPaymentModalVisible(true)} />
        <MenuRow icon={Settings} label="Paramètres" onPress={() => router.push("/settings")} />
        <MenuRow icon={Info} label="À propos" onPress={() => router.push("/about")} />
        <MenuRow icon={LogOut} label="Déconnexion" onPress={handleLogout} danger />
      </View>

      {/* ── Favorites ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes favoris</Text>
        {favorites.isLoading ? null : (favorites.data ?? []).length === 0 ? (
          <EmptyState icon={Heart} title="Aucun garage favori" description="Ajoutez des garages à vos favoris pour les retrouver ici." />
        ) : (
          <FlatList
            data={favorites.data ?? []}
            scrollEnabled={false}
            keyExtractor={(g, index) => g.id?.toString() ?? `fav-${index}`}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item: g }) => (
              <GarageCard
                garage={g}
                onToggleFavorite={(garage) => {
                  removeFavorite.mutate(
                    { garageId: garage.id },
                    { onSuccess: () => favorites.refetch() },
                  );
                }}
              />
            )}
          />
        )}
      </View>
      </ScrollView>

      <PaymentMethodModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={async (phoneInternational) => {
          // Persist for 1-click pay on ScanAndPayScreen
          const digits = phoneInternational.replace(/^\+?242/, "");
          const operator = digits.startsWith("06")
            ? "MTN_MOMO_COG"
            : digits.startsWith("05")
            ? "AIRTEL_COG"
            : null;
          if (!operator) return; // préfixe non supporté — ne pas enregistrer
          await SecureStore.setItemAsync(
            "wapi_payment_method",
            JSON.stringify({ phone: phoneInternational, operator }),
          );
          setPaymentModalVisible(false);
          Alert.alert("Numéro enregistré ✅", `Paiement via ${operator === "MTN_MOMO_COG" ? "MTN MoMo" : "Airtel Money"} · +${phoneInternational}`);
        }}
        userType={userType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  header: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  dashboardCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dashboardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  dashboardSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  menuGroup: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    overflow: "hidden",
    gap: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 4,
  },
  authActions: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
  },
  loginButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  footerLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
});
