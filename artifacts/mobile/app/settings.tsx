import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { PhoneInput } from "@/components/CongoPhoneInput";
import { DeleteAccountModal, type DeletionReason } from "@/components/DeleteAccountModal";
import { Bell, Moon, HelpCircle, ChevronRight, FileText, Shield, Trash2 } from "lucide-react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function SettingsScreen() {
  const colors = useColors();
  const { isAuthenticated, deleteAccount, refreshUser } = useAuth();
  const { isDark, setIsDark } = useTheme();
  const queryClient = useQueryClient();
  const profile = useGetMyProfile({ query: { enabled: isAuthenticated } as never });
  const updateProfile = useUpdateMyProfile();

  const [firstName, setFirstName] = useState(profile.data?.firstName ?? "");
  const [lastName, setLastName] = useState(profile.data?.lastName ?? "");
  const [phone, setPhone] = useState(profile.data?.phone ?? "");
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  React.useEffect(() => {
    if (profile.data) {
      setFirstName(profile.data.firstName ?? "");
      setLastName(profile.data.lastName ?? "");
      setPhone(profile.data.phone ?? "");
    }
  }, [profile.data]);

  const handleDeleteAccount = () => setShowDeleteModal(true);

  const handleConfirmDelete = async (reason: DeletionReason, detail?: string) => {
    setIsDeleting(true);
    try {
      await deleteAccount(reason, detail);
      queryClient.clear();
      router.replace("/auth");
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer le compte. Réessayez.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSave = () => {
    updateProfile.mutate(
      { data: { firstName, lastName, phone } },
      {
        onSuccess: () => {
          profile.refetch();
          refreshUser();
          Alert.alert("Succès", "Profil mis à jour avec succès !");
        },
        onError: () => Alert.alert("Erreur", "Impossible de mettre à jour le profil."),
      },
    );
  };

  return (
    <>
    <KeyboardAwareScrollViewCompat style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Profil</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Prénom</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
        />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Nom</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
        />
      </View>
      <View style={styles.field}>
        <PhoneInput
          value={phone}
          onChangeText={setPhone}
          label="Téléphone"
        />
      </View>

      <Pressable onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
        <Text style={styles.saveButtonText}>{updateProfile.isPending ? "Enregistrement…" : "Enregistrer"}</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 28 }]}>Préférences</Text>
      <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
        <View style={styles.toggleLabel}>
          <Bell size={16} color={colors.foreground} />
          <Text style={[styles.toggleText, { color: colors.foreground }]}>Notifications</Text>
        </View>
        <Switch
          value={notifEnabled}
          onValueChange={setNotifEnabled}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
        <View style={styles.toggleLabel}>
          <Moon size={16} color={colors.foreground} />
          <Text style={[styles.toggleText, { color: colors.foreground }]}>Mode sombre</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={setIsDark}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 28 }]}>Support</Text>
      <Pressable
        onPress={() => router.push("/faq")}
        style={[styles.menuRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.toggleLabel}>
          <HelpCircle size={16} color={colors.foreground} />
          <Text style={[styles.toggleText, { color: colors.foreground }]}>Centre d'aide</Text>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>
      <Pressable
        onPress={() => router.push("/cgu")}
        style={[styles.menuRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.toggleLabel}>
          <FileText size={16} color={colors.foreground} />
          <Text style={[styles.toggleText, { color: colors.foreground }]}>Conditions générales d'utilisation</Text>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>
      <Pressable
        onPress={() => router.push("/privacy")}
        style={[styles.menuRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.toggleLabel}>
          <Shield size={16} color={colors.foreground} />
          <Text style={[styles.toggleText, { color: colors.foreground }]}>Politique de confidentialité</Text>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>

      {/* ─── Zone danger ──────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: "#EF4444", marginTop: 36 }]}>Zone de danger</Text>
      <Pressable
        onPress={handleDeleteAccount}
        disabled={isDeleting}
        style={[styles.deleteButton, { borderColor: "#EF4444", opacity: isDeleting ? 0.5 : 1 }]}
      >
        <Trash2 size={16} color="#EF4444" />
        <Text style={styles.deleteButtonText}>
          {isDeleting ? "Suppression…" : "Supprimer mon compte"}
        </Text>
      </Pressable>
    </KeyboardAwareScrollViewCompat>

    <DeleteAccountModal
      visible={showDeleteModal}
      isDeleting={isDeleting}
      onClose={() => setShowDeleteModal(false)}
      onConfirm={handleConfirmDelete}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 14 },
  field: { marginBottom: 14, gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  saveButton: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  saveButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 8 },
  toggleText: { fontFamily: "Inter_500Medium", fontSize: 14, flexShrink: 1 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#EF4444" },
});
