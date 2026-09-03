/**
 * Onboarding — Complétion de profil (écran unique)
 *
 * Déclenché automatiquement après la création du compte (isNewUser flag).
 * Collecte en une seule étape : nom, prénom, téléphone/WhatsApp, et type de profil.
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, Wrench, ChevronRight } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUpdateMyProfile } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { PhoneInput } from "@/components/CongoPhoneInput";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ProxyImage as Image } from "@/components/ProxyImage";

const icon = require("@/assets/images/icon.png");

type AccountType = "client" | "garage_pro";

// ── Composant ──────────────────────────────────────────────────────────────────

export default function OnboardingProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const updateProfile = useUpdateMyProfile();

  // ── État du formulaire ──
  const [lastName,     setLastName]     = useState(user?.lastName  ?? "");
  const [firstName,    setFirstName]    = useState(user?.firstName ?? "");
  const [phone,        setPhone]        = useState("");
  const [accountType,  setAccountType]  = useState<AccountType | null>(null);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!lastName.trim())  next.lastName  = "Le nom est requis.";
    if (!firstName.trim()) next.firstName = "Le prénom est requis.";
    if (!phone)            next.phone     = "Le numéro de téléphone est requis.";
    if (!accountType)      next.accountType = "Veuillez sélectionner votre profil.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Soumission ──────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validate()) return;

    updateProfile.mutate(
      {
        data: {
          lastName:             lastName.trim(),
          firstName:            firstName.trim(),
          phone,
          accountType:          accountType!,
        },
      },
      {
        onSuccess: async () => {
          if (accountType === "garage_pro") {
            // Mode PRO : mémoriser et lancer la création de garage
            await AsyncStorage.setItem("user_active_mode", "PRO");
            router.replace("/onboarding/garage");
          } else {
            await AsyncStorage.removeItem("user_active_mode");
            router.replace("/(tabs)");
          }
        },
        onError: () =>
          Alert.alert("Erreur", "Impossible d'enregistrer votre profil. Veuillez réessayer."),
      },
    );
  };

  // ── Helpers UI ──────────────────────────────────────────────────────────────
  const clearError = (key: string) => {
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const isPending = updateProfile.isPending;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo + Titre ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Image source={icon} style={styles.logo} contentFit="contain" />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Bienvenue sur WapiGarage !
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Complétons votre profil pour une meilleure expérience.
          </Text>
        </View>

        {/* ── Barre de progression ─────────────────────────────────────────── */}
        <View style={styles.progressWrap}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              Étape 1 sur 1
            </Text>
            <Text style={[styles.progressPct, { color: colors.primary }]}>100 %</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* ── Formulaire ───────────────────────────────────────────────────── */}
        <View style={styles.form}>

          {/* Nom */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>NOM *</Text>
            <TextInput
              value={lastName}
              onChangeText={(v) => { setLastName(v); clearError("lastName"); }}
              placeholder="Ex : Dupont"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              returnKeyType="next"
              style={[
                styles.input,
                { backgroundColor: colors.secondary, color: colors.foreground,
                  borderColor: errors.lastName ? "#EF4444" : colors.border },
              ]}
            />
            {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
          </View>

          {/* Prénom */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PRÉNOM *</Text>
            <TextInput
              value={firstName}
              onChangeText={(v) => { setFirstName(v); clearError("firstName"); }}
              placeholder="Ex : Jean"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
              returnKeyType="next"
              style={[
                styles.input,
                { backgroundColor: colors.secondary, color: colors.foreground,
                  borderColor: errors.firstName ? "#EF4444" : colors.border },
              ]}
            />
            {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
          </View>

          {/* Téléphone / WhatsApp */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              TÉLÉPHONE / WHATSAPP *
            </Text>
            <PhoneInput
              value={phone}
              onChangeText={(v) => { setPhone(v); clearError("phone"); }}
            />
            {errors.phone
              ? <Text style={styles.errorText}>{errors.phone}</Text>
              : <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Ce numéro sera utilisé pour recevoir vos codes de vérification.
                </Text>
            }
          </View>

          {/* Type de profil */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              JE SUIS UN(E)… *
            </Text>
            <View style={styles.typeRow}>
              <TypeCard
                icon={<User size={22} color={accountType === "client" ? colors.primary : colors.mutedForeground} />}
                label="Automobiliste"
                sublabel="Je cherche un garage"
                selected={accountType === "client"}
                onPress={() => { setAccountType("client"); clearError("accountType"); }}
                colors={colors}
              />
              <TypeCard
                icon={<Wrench size={22} color={accountType === "garage_pro" ? colors.primary : colors.mutedForeground} />}
                label="Professionnel"
                sublabel="Je gère un garage"
                selected={accountType === "garage_pro"}
                onPress={() => { setAccountType("garage_pro"); clearError("accountType"); }}
                colors={colors}
              />
            </View>
            {errors.accountType
              ? <Text style={[styles.errorText, { marginTop: 4 }]}>{errors.accountType}</Text>
              : null}
          </View>
        </View>

        {/* ── Note garage_pro ───────────────────────────────────────────────── */}
        {accountType === "garage_pro" && (
          <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.primary + "40" }]}>
            <ChevronRight size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Après cette étape, vous configurerez votre fiche garage.
            </Text>
          </View>
        )}

        {/* ── Bouton principal ──────────────────────────────────────────────── */}
        <Pressable
          onPress={handleSubmit}
          disabled={isPending}
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 },
          ]}
        >
          {isPending
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.submitText}>Terminer la configuration</Text>
          }
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </>
  );
}

// ── Composant TypeCard ─────────────────────────────────────────────────────────

function TypeCard({
  icon,
  label,
  sublabel,
  selected,
  onPress,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.typeCard,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary + "10" : colors.card,
        },
      ]}
    >
      <View style={[
        styles.typeIconCircle,
        { backgroundColor: selected ? colors.primary + "18" : colors.secondary },
      ]}>
        {icon}
      </View>
      <Text style={[
        styles.typeLabel,
        { color: selected ? colors.primary : colors.foreground },
      ]}>
        {label}
      </Text>
      <Text style={[styles.typeSublabel, { color: colors.mutedForeground }]}>
        {sublabel}
      </Text>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 24,
  },

  // Header
  header: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },

  // Progress
  progressWrap: { gap: 6 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  progressPct: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    width: "100%",
    height: "100%",
    borderRadius: 3,
  },

  // Form
  form: { gap: 16 },
  field: { gap: 6 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  errorText: {
    color: "#EF4444",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },

  // TypeCards
  typeRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    alignItems: "flex-start",
  },
  typeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  typeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  typeSublabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },

  // Info banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -8,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },

  // Submit
  submitButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#1D7159",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
