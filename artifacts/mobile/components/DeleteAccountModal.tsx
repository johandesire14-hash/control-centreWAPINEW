/**
 * DeleteAccountModal — Demande le motif de suppression avant confirmation.
 *
 * 4 raisons prédéfinies + "Autre" (champ texte libre).
 * Le bouton de confirmation reste désactivé tant qu'aucun motif n'est sélectionné.
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeletionReason =
  | "no_longer_use"
  | "found_alternative"
  | "technical_issues"
  | "pricing"
  | "other";

interface Reason {
  value: DeletionReason;
  label: string;
}

const REASONS: Reason[] = [
  { value: "no_longer_use",    label: "Je n'utilise plus l'application" },
  { value: "found_alternative", label: "J'ai trouvé une autre alternative" },
  { value: "technical_issues",  label: "Problèmes techniques / Bugs récurrents" },
  { value: "pricing",           label: "Frais / Tarifs trop élevés" },
  { value: "other",             label: "Autre" },
];

interface DeleteAccountModalProps {
  visible: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (reason: DeletionReason, detail?: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DeleteAccountModal({
  visible,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const colors = useColors();
  const [selected, setSelected] = useState<DeletionReason | null>(null);
  const [detail, setDetail] = useState("");

  const canConfirm =
    selected !== null && (selected !== "other" || detail.trim().length > 0);

  const handleClose = () => {
    if (isDeleting) return;
    setSelected(null);
    setDetail("");
    onClose();
  };

  const handleConfirm = () => {
    if (!canConfirm || !selected) return;
    onConfirm(selected, selected === "other" ? detail.trim() : undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <KeyboardAwareScrollViewCompat
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title */}
            <Text style={[styles.title, { color: colors.foreground }]}>
              Pourquoi nous quittez-vous ?
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Votre retour nous aide à améliorer l'application.
            </Text>

            {/* Reasons */}
            <View style={styles.reasonList}>
              {REASONS.map((r) => {
                const active = selected === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => {
                      setSelected(r.value);
                      if (r.value !== "other") setDetail("");
                    }}
                    style={[
                      styles.reasonRow,
                      {
                        borderColor: active ? "#EF4444" : colors.border,
                        backgroundColor: active ? "#FEF2F2" : colors.secondary,
                      },
                    ]}
                  >
                    {/* Radio circle */}
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: active ? "#EF4444" : colors.border,
                          backgroundColor: active ? "#EF4444" : "transparent",
                        },
                      ]}
                    >
                      {active ? (
                        <View style={styles.radioDot} />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.reasonLabel,
                        { color: active ? "#EF4444" : colors.foreground },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Free-text for "Autre" */}
            {selected === "other" ? (
              <TextInput
                style={[
                  styles.detailInput,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Précisez votre raison…"
                placeholderTextColor={colors.mutedForeground}
                value={detail}
                onChangeText={setDetail}
                multiline
                maxLength={400}
                autoFocus
              />
            ) : null}

            {/* Actions */}
            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm || isDeleting}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: canConfirm ? "#EF4444" : colors.border,
                  opacity: isDeleting ? 0.6 : 1,
                },
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirmer la suppression</Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleClose}
              disabled={isDeleting}
              style={styles.cancelBtn}
            >
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
                Annuler
              </Text>
            </Pressable>
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 6,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  reasonList: {
    gap: 10,
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  reasonLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flex: 1,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  detailInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.4,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
