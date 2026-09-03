/**
 * PaymentMethodModal
 * Sélecteur d'opérateur Mobile Money (Congo 🇨🇬) avec flux OTP WhatsApp à 2 étapes.
 *
 * Props :
 *  - visible      : boolean
 *  - onClose      : () => void
 *  - onSuccess    : (phoneInternational: string) => void
 *  - onRefetch?   : () => void   — rafraîchit la liste après vérification
 *  - userType     : 'PRO' | 'CLIENT'
 */
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  CongoPhoneInput,
  detectCongoOperator,
  toCongoApiProvider,
  validateCongoPhone,
} from "@/components/CongoPhoneInput";

// ── Types ────────────────────────────────────────────────────────────────────

import type { CongoOperator } from "@/components/CongoPhoneInput";
type Step = "form" | "otp";

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (phoneInternational: string) => void;
  onRefetch?: () => void;
  userType?: "PRO" | "CLIENT";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const _rawDomain = (process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev");
if (!_rawDomain) {
  console.error(
    "[PaymentMethodModal] ⚠️  EXPO_PUBLIC_API_DOMAIN is not set — API calls will fail on device. " +
      "Make sure the workflow injects EXPO_PUBLIC_API_DOMAIN=$REPLIT_DEV_DOMAIN.",
  );
}
const API_BASE = _rawDomain ? `https://${_rawDomain}` : "";

const AUTH_TOKEN_KEY = "auth_session_token";
const OTP_LENGTH = 6;

/** Traduit les erreurs techniques en messages compréhensibles. */
function friendlyError(raw: string): string {
  if (
    raw.toLowerCase().includes("authentication required") ||
    raw.toLowerCase().includes("unauthorized")
  ) {
    return "Session expirée. Veuillez vous reconnecter et réessayer.";
  }
  if (
    raw.toLowerCase().includes("infobip") ||
    raw.toLowerCase().includes("whatsapp error") ||
    raw.toLowerCase().includes("impossible d'envoyer")
  ) {
    return "Erreur de configuration du service SMS. Veuillez réessayer plus tard.";
  }
  return raw;
}
const RESEND_COOLDOWN_S = 60;

// ── Component ────────────────────────────────────────────────────────────────

export function PaymentMethodModal({
  visible,
  onClose,
  onSuccess,
  onRefetch,
  userType = "CLIENT",
}: PaymentMethodModalProps) {
  const colors = useColors();

  // ── State ──
  const [step, setStep] = useState<Step>("form");
  const [operator, setOperator] = useState<CongoOperator>("MTN_MOMO_COG");
  const [phone, setPhone] = useState(""); // 9 chiffres
  const [holderName, setHolderName] = useState(""); // PRO seulement
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 6 OTP cell refs (fixed count — safe for hooks rules)
  const otpRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // ── Countdown ──
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── Phone auto-detect ──
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const detected = detectCongoOperator(val);
    if (detected) setOperator(detected);
    setError(null);
  };

  // ── OTP cell input ──
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) otpRefs[index + 1].current?.focus();
    if (!digit && index > 0) otpRefs[index - 1].current?.focus();
  };

  // ── API: send OTP via WhatsApp ──
  const sendOtp = async () => {
    const phoneInternational = `+242${phone}`;
    const provider = toCongoApiProvider(operator);

    setLoading(true);
    setError(null);

    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/api/momo/send-verification-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phoneNumber: phoneInternational, provider }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok)
        throw new Error(data.error ?? "Erreur lors de l'envoi du code.");
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(
        friendlyError(
          err instanceof Error
            ? err.message
            : "Erreur réseau. Veuillez réessayer.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1 → request OTP ──
  const handleVerify = () => {
    setError(null);
    const validation = validateCongoPhone(phone);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }
    if (userType === "PRO" && !holderName.trim()) {
      setError("Le nom du titulaire est obligatoire.");
      return;
    }
    sendOtp();
  };

  // ── Step 2 → verify & save ──
  const handleConfirm = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError(`Entrez le code à ${OTP_LENGTH} chiffres reçu par SMS.`);
      return;
    }

    const phoneInternational = `+242${phone}`;
    const provider = toCongoApiProvider(operator);

    setLoading(true);
    setError(null);

    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const res = await fetch(`${API_BASE}/api/momo/verify-and-save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phoneNumber: phoneInternational,
          provider,
          code,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Code incorrect ou expiré.");

      Alert.alert("✅ Succès", "Compte Mobile Money vérifié avec succès !");
      onRefetch?.();
      onSuccess(phoneInternational);
      handleClose();
    } catch (err) {
      setError(
        friendlyError(
          err instanceof Error
            ? err.message
            : "Erreur réseau. Veuillez réessayer.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Reset & close ──
  const handleClose = () => {
    setStep("form");
    setPhone("");
    setHolderName("");
    setOtp(Array(OTP_LENGTH).fill(""));
    setError(null);
    setLoading(false);
    setResendCooldown(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAwareScrollViewCompat
        style={styles.overlay}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* ── Handle ── */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {step === "form" ? (
            <>
              {/* ── Title ── */}
              <Text style={[styles.title, { color: colors.foreground }]}>
                MOYENS DE PAIEMENT
              </Text>

              {/* ── Phone number ── */}
              <CongoPhoneInput
                value={phone}
                onChangeText={handlePhoneChange}
                label="NUMÉRO ASSOCIÉ AU COMPTE"
                containerStyle={{ marginBottom: 4 }}
              />

              {/* ── Account holder (PRO only) ── */}
              {userType === "PRO" && (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.mutedForeground, marginTop: 16 },
                    ]}
                  >
                    NOM DU TITULAIRE DU COMPTE
                  </Text>
                  <Text
                    style={[styles.hint, { color: colors.mutedForeground }]}
                  >
                    Nom exact figurant sur la puce MoMo (pour les virements).
                  </Text>
                  <TextInput
                    style={[
                      styles.textField,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Ex: JEAN DUPONT"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                    value={holderName}
                    onChangeText={(v) => {
                      setHolderName(v);
                      setError(null);
                    }}
                  />
                </>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* ── CTA ── */}
              <Pressable
                onPress={handleVerify}
                disabled={loading}
                style={[
                  styles.ctaButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.ctaText}>VÉRIFIER LE NUMÉRO PAR SMS</Text>
                )}
              </Pressable>
            </>
          ) : (
            /* ── STEP 2 : OTP WhatsApp ── */
            <>
              {/* ── Title ── */}
              <Text style={[styles.title, { color: colors.foreground }]}>
                Code de vérification
              </Text>

              <Text
                style={[styles.otpSubtitle, { color: colors.mutedForeground }]}
              >
                Code envoyé par SMS au{"\n"}
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  🇨🇬 +242 {phone}
                </Text>
              </Text>

              {/* ── 6-digit OTP cells ── */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={otpRefs[i]}
                    style={[
                      styles.otpCell,
                      {
                        backgroundColor: colors.input,
                        borderColor: digit ? colors.primary : colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(i, v)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              {error ? (
                <Text style={[styles.errorText, { textAlign: "center" }]}>
                  {error}
                </Text>
              ) : null}

              {/* ── Resend countdown ── */}
              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <Text
                    style={[
                      styles.resendHint,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Renvoyer le code dans{" "}
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      {resendCooldown}s
                    </Text>
                  </Text>
                ) : (
                  <Pressable onPress={sendOtp} disabled={loading} hitSlop={8}>
                    <Text
                      style={[
                        styles.resendLink,
                        { color: colors.primary, opacity: loading ? 0.5 : 1 },
                      ]}
                    >
                      Renvoyer le code
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* ── Actions ── */}
              <View style={styles.otpActions}>
                <Pressable
                  onPress={() => {
                    setStep("form");
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setError(null);
                  }}
                  style={[
                    styles.secondaryButton,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.foreground },
                    ]}
                  >
                    RETOUR
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  disabled={loading}
                  style={[
                    styles.ctaButton,
                    {
                      flex: 1,
                      backgroundColor: colors.primary,
                      opacity: loading ? 0.7 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.ctaText}>VALIDER LE CODE</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.8,
    marginBottom: 20,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginBottom: 8,
    marginTop: -4,
  },
  textField: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  errorText: {
    color: "#E4002B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 8,
  },
  ctaButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  ctaText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  // ── OTP step ──
  otpSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
  },
  otpCell: {
    width: 50,
    height: 62,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  resendRow: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
    minHeight: 24,
  },
  resendHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  resendLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textDecorationLine: "underline",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  otpActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.6,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
