/**
 * ScanAndPayScreen — Interface Client
 * Scanner un QR Code de facture garage et payer en 1-clic Mobile Money.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, QrCode, RotateCcw, ScanLine, Star, X, Zap } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_KEY = "wapi_payment_method";
const AUTH_TOKEN_KEY = "auth_session_token";
const { width: SW } = Dimensions.get("window");
const FINDER_SIZE = SW * 0.68;
const CORNER_LEN = 32;
const CORNER_THICK = 3.5;

function getApiBase() {
  return (process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")
    ? `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")}`
    : "";
}

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function operatorLabel(op: string) {
  return op === "MTN_MOMO_COG" ? "MTN MoMo" : "Airtel Money";
}

function operatorColor(op: string) {
  return op === "MTN_MOMO_COG" ? "#FFCC00" : "#FF0000";
}

function maskPhone(phone: string) {
  const d = phone.replace(/^\+?/, "");
  if (d.length < 9) return `+${d}`;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} XXX XX ${d.slice(-2)}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface QRPayload {
  invoiceId: string;
  garage: string;
  garageId?: number;
  description: string;
  amount: number;
  externalId?: string;
  status?: string;
}

interface PaymentMethod {
  phone: string;
  operator: string;
}

type Step = "scanner" | "confirm" | "processing" | "success" | "error";

// ── Corner bracket ─────────────────────────────────────────────────────────────

function Corner({
  top, bottom, left, right, color,
}: {
  top?: number; bottom?: number; left?: number; right?: number; color: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        width: CORNER_LEN,
        height: CORNER_LEN,
        top,
        bottom,
        left,
        right,
        borderColor: color,
        borderTopWidth: top !== undefined ? CORNER_THICK : 0,
        borderBottomWidth: bottom !== undefined ? CORNER_THICK : 0,
        borderLeftWidth: left !== undefined ? CORNER_THICK : 0,
        borderRightWidth: right !== undefined ? CORNER_THICK : 0,
        borderTopLeftRadius: top !== undefined && left !== undefined ? 6 : 0,
        borderTopRightRadius: top !== undefined && right !== undefined ? 6 : 0,
        borderBottomLeftRadius: bottom !== undefined && left !== undefined ? 6 : 0,
        borderBottomRightRadius: bottom !== undefined && right !== undefined ? 6 : 0,
        // Glow
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
        elevation: 4,
      }}
    />
  );
}

// ── Animated scan line ─────────────────────────────────────────────────────────

function AnimatedScanLine({ size }: { size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size - 4],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        height: 2,
        backgroundColor: "rgba(52,161,122,0.85)",
        borderRadius: 2,
        transform: [{ translateY }],
        shadowColor: "#34a17a",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 6,
      }}
    />
  );
}

// ── Pulse rings (success animation) ───────────────────────────────────────────

function PulseRings() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();

    pulse(ring1, 0);
    pulse(ring2, 700);
  }, [ring1, ring2]);

  const ringStyle = (anim: Animated.Value) => ({
    position: "absolute" as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "rgba(34,197,94,0.5)",
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.7, 0.3, 0] }),
  });

  return (
    <>
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ScanAndPayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  // Deep-link params contain only the opaque invoiceId.
  const { invoiceId: dlInvoiceId } = useLocalSearchParams<{ invoiceId?: string }>();

  const [step, setStep] = useState<Step>("scanner");
  const [scanned, setScanned] = useState(false);
  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [paidAt, setPaidAt] = useState<string>("");

  // Slide-in animation for confirm modal content
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openInvoice = useCallback(async (invoiceId: string) => {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const res = await fetch(`${getApiBase()}/api/invoices/${encodeURIComponent(invoiceId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || typeof data?.invoiceId !== "string") throw new Error(data?.error ?? "Facture introuvable.");
    if (data.status === "paid" || data.status === "expired" || data.status === "cancelled") throw new Error("Cette facture ne peut plus être payée.");
    const p: QRPayload = {
      invoiceId: data.invoiceId,
      garage: data.garage?.name ?? "Garage",
      garageId: typeof data.garage?.id === "number" ? data.garage.id : undefined,
      description: data.description ?? "",
      amount: Number(data.amount),
      status: data.status,
    };
    setPayload(p);
    setScanned(true);
    setStep("confirm");
    slideAnim.setValue(40);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (!dlInvoiceId || scanned) return;
    openInvoice(dlInvoiceId).catch((error) => {
      setErrorMsg(error instanceof Error ? error.message : "Facture introuvable.");
      setStep("error");
    });
  }, [dlInvoiceId, openInvoice, scanned]);

  // Load saved payment method
  useEffect(() => {
    SecureStore.getItemAsync(PAYMENT_KEY).then((raw) => {
      if (raw) {
        try {
          setPaymentMethod(JSON.parse(raw) as PaymentMethod);
        } catch {}
      }
    });
  }, []);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      try {
        const parsed = JSON.parse(data) as { invoiceId?: unknown };
        if (typeof parsed.invoiceId !== "string" || !parsed.invoiceId) throw new Error("invalid");
        void openInvoice(parsed.invoiceId).catch((error) => {
          setErrorMsg(error instanceof Error ? error.message : "Facture introuvable.");
          setStep("error");
        });
      } catch {
        // Not a Wapi invoice QR — keep scanning
      }
    },
    [scanned, openInvoice],
  );

  const resetScanner = () => {
    setScanned(false);
    setPayload(null);
    setStep("scanner");
    setErrorMsg("");
  };

  const handlePay = async () => {
    if (!payload) return;
    setStep("processing");
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const pm = paymentMethod;
      if (!pm) throw new Error("Aucun moyen de paiement configuré.");
      const res = await fetch(`${getApiBase()}/api/kpay/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          invoiceId: payload.invoiceId,
          phoneNumber: pm.phone,
          provider: pm.operator,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Erreur ${res.status}`);
      }
      const initial = (await res.json().catch(() => ({}))) as { status?: string; externalId?: string };
      if (initial.externalId) setPayload((current) => current ? { ...current, externalId: initial.externalId, status: initial.status } : current);
      let status = initial.status;
      for (let attempt = 0; attempt < 12 && status === "pending"; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const statusRes = await fetch(`${getApiBase()}/api/invoices/${encodeURIComponent(payload.invoiceId)}/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const statusData = (await statusRes.json().catch(() => ({}))) as { status?: string };
        status = statusData.status;
      }
      if (status !== "paid") throw new Error(status === "expired" ? "La facture a expiré." : "Le paiement est encore en attente ou a échoué.");
      setPaidAt(new Date().toISOString());
      setStep("success");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue.");
      setStep("error");
    }
  };

  // ── Permission loading ──
  if (!permission) {
    return <View style={[S.fill, { backgroundColor: "#000" }]} />;
  }

  // ── Permission denied ──
  if (!permission.granted) {
    return (
      <View style={[S.center, { backgroundColor: "#0A0A0A", paddingTop: insets.top }]}>
        <View style={S.iconRing}>
          <QrCode size={36} color="#FFFFFF" />
        </View>
        <Text style={S.gateTitle}>Accès caméra requis</Text>
        <Text style={S.gateSub}>
          Pour scanner un QR Code de facture, autorisez l'accès à la caméra depuis les réglages.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={S.btn}
          accessibilityRole="button"
          accessibilityLabel="Autoriser l'accès à la caméra"
        >
          <Text style={S.btnText}>Autoriser la caméra</Text>
        </Pressable>
      </View>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <View
        style={[S.center, { backgroundColor: colors.background, paddingTop: insets.top }]}
      >
        <View style={[S.iconRing, { backgroundColor: colors.secondary }]}>
          <QrCode size={36} color={colors.mutedForeground} />
        </View>
        <Text style={[S.gateTitle, { color: colors.foreground }]}>
          Connectez-vous pour payer
        </Text>
        <Text style={[S.gateSub, { color: colors.mutedForeground }]}>
          Un compte est nécessaire pour accéder au paiement 1-Clic.
        </Text>
        <Pressable
          onPress={() => router.push("/auth")}
          style={[S.btn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Se connecter pour accéder au paiement"
        >
          <Text style={S.btnText}>Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  // ── SUCCESS ──
  if (step === "success") {
    return (
      <View
        style={[
          S.center,
          { backgroundColor: "#060F0B", paddingHorizontal: 28, paddingTop: insets.top },
        ]}
      >
        {/* Pulse rings behind icon */}
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <PulseRings />
          <CheckCircle size={80} color="#22C55E" />
        </View>

        <Text style={S.successTitle}>Paiement effectué !</Text>

        <Text style={S.successAmount}>
          {payload ? formatFCFA(payload.amount) : ""}
        </Text>

        {payload?.garage ? (
          <Text style={S.successGarage}>{payload.garage}</Text>
        ) : null}

        {payload?.description ? (
          <Text style={S.successDesc} numberOfLines={2}>
            {payload.description}
          </Text>
        ) : null}

        <View style={S.successDivider} />

        <View style={{ width: "100%", gap: 12 }}>
          <Pressable
            style={S.receiptBtn}
            onPress={() => {
              if (!payload) return;
              const params = new URLSearchParams({
                garage: payload.garage,
                garageId: payload.garageId != null ? String(payload.garageId) : "",
                description: payload.description,
                amount: String(payload.amount),
                externalId: payload.externalId ?? payload.invoiceId,
                invoiceId: payload.invoiceId,
                paidAt: paidAt || new Date().toISOString(),
              });
              router.push(`/receipt?${params.toString()}`);
              resetScanner();
            }}
            accessibilityRole="button"
            accessibilityLabel="Voir mon reçu et laisser un avis"
          >
            <Star size={17} color="#060F0B" fill="#060F0B" />
            <Text style={S.receiptBtnText}>Voir mon reçu & Laisser un avis</Text>
          </Pressable>

          <Pressable
            onPress={resetScanner}
            style={S.ghostBtn}
            accessibilityRole="button"
            accessibilityLabel="Scanner une nouvelle facture"
          >
            <Text style={S.ghostBtnText}>Scanner une nouvelle facture</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── PROCESSING ──
  if (step === "processing") {
    return (
      <View style={[S.center, { backgroundColor: "#0A0A0A" }]}>
        <View style={S.processingRing}>
          <ActivityIndicator size="large" color="#34a17a" />
        </View>
        <Text style={S.processingTitle}>Paiement en cours…</Text>
        <Text style={S.processingText}>Vérifiez votre téléphone</Text>
        {paymentMethod ? (
          <View style={S.processingBadge}>
            <View
              style={[
                S.operatorDot,
                { backgroundColor: operatorColor(paymentMethod.operator) },
              ]}
            />
            <Text style={S.processingBadgeText}>
              {operatorLabel(paymentMethod.operator)} · {maskPhone(paymentMethod.phone)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  // ── ERROR ──
  if (step === "error") {
    return (
      <View style={[S.center, { backgroundColor: "#0A0A0A", paddingHorizontal: 28 }]}>
        <View style={[S.iconRing, { backgroundColor: "rgba(255,59,48,0.15)" }]}>
          <X size={32} color="#FF3B30" />
        </View>
        <Text style={S.errorTitle}>Paiement échoué</Text>
        <Text style={S.errorMsg}>{errorMsg}</Text>
        <Pressable onPress={resetScanner} style={[S.btn, { flexDirection: "row", gap: 8 }]}>
          <RotateCcw size={16} color="#FFFFFF" />
          <Text style={S.btnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  // ── SCANNER + CONFIRM modal ──
  const sideW = (SW - FINDER_SIZE) / 2;
  const topH = sideW + insets.top + 48;
  const cornerColor = "#34a17a";

  return (
    <View style={S.fill}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={step === "scanner" ? handleBarcode : undefined}
      />

      {/* Dark overlay bands (no background on finder area = transparent window) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top */}
        <View style={[S.band, { height: topH }]} />
        {/* Middle row */}
        <View style={{ flexDirection: "row", height: FINDER_SIZE }}>
          <View style={[S.band, { width: sideW }]} />
          {/* Finder: transparent + corners + scan line */}
          <View style={{ width: FINDER_SIZE, height: FINDER_SIZE }}>
            <Corner top={0} left={0} color={cornerColor} />
            <Corner top={0} right={0} color={cornerColor} />
            <Corner bottom={0} left={0} color={cornerColor} />
            <Corner bottom={0} right={0} color={cornerColor} />
            <AnimatedScanLine size={FINDER_SIZE} />
          </View>
          <View style={[S.band, { width: sideW }]} />
        </View>
        {/* Bottom */}
        <View style={[S.band, { flex: 1 }]} />
      </View>

      {/* Header */}
      <View
        style={[S.scanHeader, { paddingTop: insets.top + 16 }]}
        pointerEvents="none"
      >
        <Text style={S.scanTitle}>Scanner une facture</Text>
        <Text style={S.scanHint}>Cadrez le QR Code du garagiste dans le viseur</Text>
      </View>

      {/* Footer */}
      <View style={[S.scanFooter, { paddingBottom: insets.bottom + 100 }]}>
        {paymentMethod ? (
          <View style={S.pmPill}>
            <View
              style={[
                S.operatorDot,
                { backgroundColor: operatorColor(paymentMethod.operator) },
              ]}
            />
            <Text style={S.pmPillText}>
              {operatorLabel(paymentMethod.operator)} · {maskPhone(paymentMethod.phone)}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/(tabs)/account")}
            style={[S.pmPill, S.pmPillWarn]}
          >
            <Text style={S.pmPillText}>⚠️ Configurer un moyen de paiement →</Text>
          </Pressable>
        )}
      </View>

      {/* ── CONFIRMATION MODAL ── */}
      <Modal
        visible={step === "confirm"}
        transparent
        animationType="slide"
        onRequestClose={resetScanner}
      >
        <View style={S.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={resetScanner} />

          <Animated.View
            style={[
              S.sheet,
              {
                paddingBottom: Math.max(insets.bottom + 16, 32),
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Handle */}
            <View style={S.handle} />

            {/* Close */}
            <Pressable onPress={resetScanner} style={S.closeBtn} hitSlop={12}>
              <X size={18} color="#8E8E93" />
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {/* Garage + service */}
              <View style={{ gap: 4 }}>
                <Text style={S.sheetGarage} numberOfLines={1}>
                  {payload?.garage ?? "Garage"}
                </Text>
                <Text style={S.sheetDesc} numberOfLines={3}>
                  {payload?.description}
                </Text>
              </View>

              {/* Amount */}
              <View style={S.amountBox}>
                <Text style={S.amountLabel}>MONTANT TOTAL</Text>
                <Text style={S.amountBig}>
                  {payload ? formatFCFA(payload.amount) : "—"}
                </Text>
              </View>

              {/* Payment method */}
              <View style={S.pmRow}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={S.pmRowLabel}>MOYEN DE PAIEMENT</Text>
                  {paymentMethod ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View
                        style={[
                          S.operatorBadge,
                          { backgroundColor: operatorColor(paymentMethod.operator) },
                        ]}
                      >
                        <Text style={S.operatorBadgeText}>
                          {operatorLabel(paymentMethod.operator)}
                        </Text>
                      </View>
                      <Text style={S.pmRowValue}>
                        {maskPhone(paymentMethod.phone)}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        resetScanner();
                        router.push("/(tabs)/account");
                      }}
                    >
                      <Text style={[S.pmRowValue, { color: "#FF3B30" }]}>
                        ⚠️ Aucun moyen de paiement — Configurer →
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Pay CTA */}
              <Pressable
                onPress={paymentMethod ? handlePay : undefined}
                style={({ pressed }) => [
                  S.payCta,
                  !paymentMethod && { opacity: 0.38 },
                  pressed && paymentMethod && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={S.payCtaText}>
                  Payer {payload ? formatFCFA(payload.amount) : ""} en 1-Clic
                </Text>
              </Pressable>

              <Pressable onPress={resetScanner} style={S.cancelLink}>
                <Text style={S.cancelText}>Annuler</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const a = Platform.OS === "android" ? { includeFontPadding: false } : {};

const S = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },

  // Camera overlay
  band: { backgroundColor: "rgba(0,0,0,0.65)" },

  scanHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
  },
  scanTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    ...a,
  },
  scanHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    ...a,
  },

  scanFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  pmPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  pmPillWarn: {
    borderColor: "rgba(255,196,0,0.3)",
    backgroundColor: "rgba(30,20,0,0.75)",
  },
  pmPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#FFFFFF",
    ...a,
  },
  operatorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  // Gate screens (permission / auth)
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gateTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    ...a,
  },
  gateSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    paddingHorizontal: 36,
    lineHeight: 22,
    ...a,
  },
  btn: {
    backgroundColor: "#1D7159",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    ...a,
  },

  // Processing
  processingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(52,161,122,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(52,161,122,0.25)",
  },
  processingTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    ...a,
  },
  processingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    ...a,
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  processingBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    ...a,
  },

  // Error
  errorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FF3B30",
    ...a,
  },
  errorMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    paddingHorizontal: 28,
    lineHeight: 22,
    ...a,
  },

  // Success
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#22C55E",
    marginTop: 12,
    ...a,
  },
  successAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    color: "#FFFFFF",
    ...a,
  },
  successGarage: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    ...a,
  },
  successDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    ...a,
  },
  successDivider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },
  receiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 16,
  },
  receiptBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#060F0B",
    ...a,
  },
  ghostBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  ghostBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    ...a,
  },

  // Modal / sheet
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E5EA",
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

  sheetGarage: {
    fontFamily: "Inter_700Bold",
    fontSize: 21,
    color: "#1C1C1E",
    ...a,
  },
  sheetDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 21,
    ...a,
  },

  amountBox: {
    backgroundColor: "#F2F3F5",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 4,
  },
  amountLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#8E8E93",
    ...a,
  },
  amountBig: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    color: "#1C1C1E",
    ...a,
  },

  pmRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    padding: 14,
    gap: 6,
  },
  pmRowLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#8E8E93",
    ...a,
  },
  pmRowValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#1C1C1E",
    ...a,
  },
  operatorBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  operatorBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#000000",
    ...a,
  },

  payCta: {
    backgroundColor: "#1D7159",
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  payCtaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.2,
    ...a,
  },

  cancelLink: { alignItems: "center", paddingVertical: 6 },
  cancelText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#8E8E93",
    ...a,
  },
});
