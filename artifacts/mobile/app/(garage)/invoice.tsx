/**
 * CreateInvoiceScreen — Espace Garagiste PRO
 * Crée une facture et encaisse en Mobile Money (MTN / Airtel Congo 🇨🇬)
 * Mode A : QR Code   |   Mode B : Push direct
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useLocalSearchParams } from "expo-router";
import { CheckCircle, QrCode, Smartphone, RotateCcw, X, ChevronDown } from "lucide-react-native";
import { Link2 } from "lucide-react-native";
import { useG, type GarageTheme } from "./_layout";
import { useGetMyGarage } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import {
  CongoPhoneInput,
  detectCongoOperator,
  validateCongoPhone,
  toCongoApiProvider,
} from "@/components/CongoPhoneInput";

// ── ModeTab ───────────────────────────────────────────────────────────────────

function ModeTab({
  G,
  active,
  icon: Icon,
  label,
  onPress,
}: {
  G: GarageTheme;
  active: boolean;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
          gap: 7, borderRadius: 12, borderWidth: 1.5, paddingVertical: 13,
          backgroundColor: active ? G.greenBg : G.card,
          borderColor: active ? G.green : G.border,
        },
      ]}
    >
      <Icon size={17} color={active ? G.green : G.muted} />
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
          color: active ? G.green : G.muted,
          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMISSION_RATE = 0.02; // 2 % Wapi
const AUTH_TOKEN_KEY = "auth_session_token";

function getApiBase() {
  return (process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")
    ? `https://${(process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev")}`
    : "";
}


function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "qr" | "push" | "link";
type Status = "idle" | "pending" | "success" | "error";

// ── Mode options config ────────────────────────────────────────────────────────

const MODE_OPTIONS: Array<{
  value: Mode;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  description: string;
}> = [
  { value: "qr",   icon: QrCode,    label: "QR Code", description: "Client sur place — il scanne avec son appli Mobile Money" },
  { value: "push", icon: Smartphone, label: "Push",    description: "Demande directe sur le téléphone du client" },
  { value: "link", icon: Link2,      label: "Lien",    description: "Envoi du lien par WhatsApp, SMS ou autre" },
];

// ── ModeDropdown ──────────────────────────────────────────────────────────────

function ModeDropdown({
  G,
  mode,
  open,
  onOpen,
  onSelect,
}: {
  G: GarageTheme;
  mode: Mode;
  open: boolean;
  onOpen: () => void;
  onSelect: (m: Mode) => void;
}) {
  const selected = MODE_OPTIONS.find((o) => o.value === mode)!;
  const Icon = selected.icon;
  const android = Platform.OS === "android" ? { includeFontPadding: false } : {};

  return (
    <>
      {/* ── Trigger field ── */}
      <Pressable
        onPress={onOpen}
        style={[
          dropdownStyles.trigger,
          { backgroundColor: G.card, borderColor: G.border },
        ]}
      >
        <View style={dropdownStyles.triggerLeft}>
          <View style={[dropdownStyles.iconWrap, { backgroundColor: G.greenBg }]}>
            <Icon size={18} color={G.green} />
          </View>
          <Text style={[dropdownStyles.triggerLabel, { color: G.text, ...android }]}>
            {selected.label}
          </Text>
          <Text style={[dropdownStyles.triggerDesc, { color: G.muted, ...android }]}>
            — {selected.description}
          </Text>
        </View>
        <ChevronDown size={18} color={G.muted} />
      </Pressable>

      {/* ── Bottom-sheet modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => onSelect(mode)}
      >
        <TouchableWithoutFeedback onPress={() => onSelect(mode)}>
          <View style={dropdownStyles.overlay} />
        </TouchableWithoutFeedback>

        <View style={[dropdownStyles.sheet, { backgroundColor: G.card }]}>
          {/* Handle */}
          <View style={[dropdownStyles.handle, { backgroundColor: G.border }]} />

          <Text style={[dropdownStyles.sheetTitle, { color: G.muted, ...android }]}>
            MODE D'ENCAISSEMENT
          </Text>

          {MODE_OPTIONS.map((opt) => {
            const OptionIcon = opt.icon;
            const isActive = opt.value === mode;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                style={[
                  dropdownStyles.option,
                  {
                    backgroundColor: isActive ? G.greenBg : "transparent",
                    borderColor: isActive ? G.green : G.border,
                  },
                ]}
              >
                <View style={[
                  dropdownStyles.optionIconWrap,
                  { backgroundColor: isActive ? G.green : G.bg },
                ]}>
                  <OptionIcon size={20} color={isActive ? "#FFFFFF" : G.muted} />
                </View>
                <View style={dropdownStyles.optionText}>
                  <Text style={[
                    dropdownStyles.optionLabel,
                    { color: isActive ? G.green : G.text, ...android },
                  ]}>
                    {opt.label}
                  </Text>
                  <Text style={[dropdownStyles.optionDesc, { color: G.muted, ...android }]}>
                    {opt.description}
                  </Text>
                </View>
                {isActive && (
                  <View style={[dropdownStyles.activeDot, { backgroundColor: G.green }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const dropdownStyles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
    overflow: "hidden",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  triggerDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  optionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CreateInvoiceScreen() {
  const G = useG();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(G), [G]);
  const { isAuthenticated, user } = useAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const myGarage = useGetMyGarage({ query: { enabled: isAuthenticated } as never });
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);


  // Form
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("25000");
  const [phone, setPhone] = useState(""); // 9 digits

  // Mode & status
  const [mode, setMode] = useState<Mode>("qr");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status !== "pending" || !createdInvoiceId) return;
    let cancelled = false;
    const poll = async () => {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const response = await fetch(`${getApiBase()}/api/invoices/${createdInvoiceId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok || cancelled) return;
      const data = (await response.json()) as { status?: string; amount?: number };
      if (typeof data.amount === "number") setAmountStr(String(data.amount));
      if (data.status === "paid") setStatus("success");
      if (data.status === "expired" || data.status === "cancelled" || data.status === "failed") {
        setStatus("error");
        setErrorMsg("Cette facture n'est plus payable.");
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [createdInvoiceId, status]);

  // QR payload (built on submit)
  const [qrPayload, setQrPayload] = useState<string | null>(null);

  // ── Derived ──
  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const commission = Math.round(amount * COMMISSION_RATE);
  const netAmount = amount - commission;

  // Auto-detect operator
  const provider = detectCongoOperator(phone);

  // ── Validation ──
  const validate = (): string | null => {
    if (!conversationId) return "Ouvrez une demande client avant de créer une facture.";
    if (!description.trim()) return "Décrivez les travaux effectués.";
    if (!amount || amount < 100) return "Le montant minimum est 100 FCFA.";
    if (mode === "push") {
      const v = validateCongoPhone(phone);
      if (!v.valid) return v.error!;
    }
    return null;
  };

    // ── Server invoice creation ──
  const createServerInvoice = async () => {
    if (!conversationId) throw new Error("Cette facture doit être créée depuis une demande client.");
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const res = await fetch(`${getApiBase()}/api/invoices/from-conversation/${conversationId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ amount, description: description.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
    const created = data as { invoiceId: string; amount: number; description?: string };
    setCreatedInvoiceId(created.invoiceId);
    setAmountStr(String(created.amount));
    return created;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    setStatus("pending");
    try {
      const created = createdInvoiceId ? { invoiceId: createdInvoiceId, amount } : await createServerInvoice();
      if (mode === "qr") {
        setQrPayload(JSON.stringify({ invoiceId: created.invoiceId }));
        return;
      }
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const res = await fetch(`${getApiBase()}/api/kpay/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          invoiceId: created.invoiceId,
          phoneNumber: `242${phone}`,
          provider: provider ? toCongoApiProvider(provider) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  };

  // ── Share link (invoiceId only) ──
  const handleShareLink = async () => {
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    try {
      const created = createdInvoiceId ? { invoiceId: createdInvoiceId, amount } : await createServerInvoice();
      const garageName = myGarage.data?.name ?? "Garage";
      const shareUrl = `https://wapigarage.app/pay?invoiceId=${encodeURIComponent(created.invoiceId)}`;
      const shareMessage =
        `🧾 *Facture Wapi Garage*\n\n` +
        `Bonjour, votre véhicule est prêt chez *${garageName}* !\n\n` +
        `🔧 Prestation : ${description.trim()}\n` +
        `💰 Montant : ${created.amount} FCFA\n\n` +
        `Lien sécurisé : ${shareUrl}`;
      await Share.share({ message: shareMessage });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Impossible de partager la facture.");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setQrPayload(null);
    setCreatedInvoiceId(null);
    setDescription("");
    setAmountStr("25000");
    setPhone("");
    setErrorMsg("");
  };

  // ── PENDING screen ──
  if (status === "pending") {
    return (
      <View style={[styles.fullScreen, { backgroundColor: G.bg, paddingTop: insets.top + 16 }]}>
        <View style={[s.statusCard, { backgroundColor: G.card }]}>
          {mode === "qr" && qrPayload ? (
            <>
              <Text style={[s.qrAmountBig, { color: G.text }]}>{formatFCFA(amount)}</Text>
              <Text style={[s.qrDesc, { color: G.muted }]} numberOfLines={2}>
                {description}
              </Text>
              <View style={s.qrWrapper}>
                <QRCode
                  value={qrPayload}
                  size={220}
                  color={G.text}
                  backgroundColor={G.card}
                />
              </View>
              <Text style={[s.qrHint, { color: G.muted }]}>
                Le client scanne ce QR avec son application Mobile Money.
              </Text>
            </>
          ) : null}

          <View style={s.pendingRow}>
            <ActivityIndicator color="#3B82F6" size="small" />
            <Text style={[s.pendingText, { color: "#3B82F6" }]}>
              En attente du paiement du client…
            </Text>
          </View>

          <Pressable
            onPress={handleReset}
            style={[s.cancelBtn, { borderColor: G.border }]}
          >
            <X size={15} color={G.muted} />
            <Text style={[s.cancelBtnText, { color: G.muted }]}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── SUCCESS screen ──
  if (status === "success") {
    return (
      <View style={[styles.fullScreen, { backgroundColor: G.bg, paddingTop: insets.top + 16 }]}>
        <View style={[s.statusCard, { backgroundColor: G.card }]}>
          <View style={s.successIcon}>
            <CheckCircle size={64} color="#22C55E" />
          </View>
          <Text style={s.successTitle}>Paiement reçu !</Text>
          <Text style={[s.successAmount, { color: "#22C55E" }]}>
            {formatFCFA(amount)}
          </Text>
          <Text style={[s.successDesc, { color: G.muted }]} numberOfLines={2}>
            {description}
          </Text>

          {/* Commission breakdown */}
          <View style={[s.commissionBox, { backgroundColor: G.bg, borderColor: G.border }]}>
            <View style={s.commissionRow}>
              <Text style={[s.commissionLabel, { color: G.muted }]}>Montant net garage</Text>
              <Text style={[s.commissionValue, { color: G.text }]}>
                {formatFCFA(netAmount)}
              </Text>
            </View>
            <View style={[s.commissionDivider, { backgroundColor: G.border }]} />
            <View style={s.commissionRow}>
              <Text style={[s.commissionLabel, { color: G.muted }]}>
                Commission Wapi ({(COMMISSION_RATE * 100).toFixed(0)} %)
              </Text>
              <Text style={[s.commissionValue, { color: G.muted }]}>
                − {formatFCFA(commission)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleReset}
            style={[s.newInvoiceBtn, { backgroundColor: G.green }]}
          >
            <RotateCcw size={16} color="#FFFFFF" />
            <Text style={s.newInvoiceBtnText}>Créer une nouvelle facture</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── FORM ──
  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={s.headerTitle}>Nouvelle facture</Text>
        {myGarage.data?.name ? (
          <Text style={s.headerSub}>{myGarage.data.name}</Text>
        ) : null}
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Description ── */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: G.muted }]}>DESCRIPTION DES TRAVAUX</Text>
          <TextInput
            style={[s.textArea, { backgroundColor: G.card, borderColor: G.border, color: G.text }]}
            placeholder="Ex : Vidange + Changement filtre à huile"
            placeholderTextColor={G.muted}
            value={description}
            onChangeText={(v) => { setDescription(v); setErrorMsg(""); }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Amount ── */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: G.muted }]}>MONTANT TOTAL</Text>
          <View style={[s.amountRow, { backgroundColor: G.card, borderColor: G.border }]}>
            <TextInput
              style={[s.amountInput, { color: G.text }]}
              value={amountStr}
              onChangeText={(v) => {
                setAmountStr(v.replace(/\D/g, ""));
                setErrorMsg("");
              }}
              keyboardType="number-pad"
              placeholder="25000"
              placeholderTextColor={G.muted}
            />
            <View style={[s.currencyBadge, { backgroundColor: G.greenBg }]}>
              <Text style={[s.currencyText, { color: G.green }]}>FCFA</Text>
            </View>
          </View>
          {amount > 0 ? (
            <Text style={[s.commissionHint, { color: G.muted }]}>
              Net garage : {formatFCFA(netAmount)} · Commission Wapi : {formatFCFA(commission)}
            </Text>
          ) : null}
        </View>

        {/* ── Mode selector ── */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: G.muted }]}>MODE D'ENCAISSEMENT</Text>
          <View style={s.modeRow}>
            <ModeTab
              G={G}
              active={mode === "qr"}
              icon={QrCode}
              label="QR Code"
              onPress={() => setMode("qr")}
            />
            <ModeTab
              G={G}
              active={mode === "push"}
              icon={Smartphone}
              label="Push"
              onPress={() => setMode("push")}
            />
            <ModeTab
              G={G}
              active={mode === "link"}
              icon={Link2}
              label="Lien"
              onPress={() => setMode("link")}
            />
          </View>
        </View>

        {/* ── Phone (push only) ── */}
        {mode === "push" ? (
          <View style={s.fieldBlock}>
            <CongoPhoneInput
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrorMsg(""); }}
              label="NUMÉRO MOBILE MONEY DU CLIENT"
            />
          </View>
        ) : mode === "link" ? (
          /* Link / deep-link info box */
          <View style={[s.infoBox, { backgroundColor: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.35)" }]}>
            <Text style={[s.infoText, { color: "#3B82F6" }]}>
              Un lien de paiement sera généré et partagé via WhatsApp, SMS ou toute autre application. Le client clique pour régler directement depuis Wapi Garage.
            </Text>
          </View>
        ) : (
          /* QR info box */
          <View style={[s.infoBox, { backgroundColor: G.greenBg, borderColor: G.green }]}>
            <Text style={[s.infoText, { color: G.green }]}>
              Un QR Code de paiement sera affiché. Le client le scanne avec son application MTN MoMo ou Airtel Money.
            </Text>
          </View>
        )}

        {/* ── Error ── */}
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : null}

        {/* ── CTA ── */}
        <Pressable
          onPress={mode === "link" ? handleShareLink : handleSubmit}
          style={[
            s.cta,
            { backgroundColor: mode === "link" ? "#3B82F6" : G.green },
          ]}
        >
          {mode === "qr" ? (
            <>
              <QrCode size={18} color="#FFFFFF" />
              <Text style={s.ctaText}>AFFICHER LE QR CODE DE PAIEMENT</Text>
            </>
          ) : mode === "push" ? (
            <>
              <Smartphone size={18} color="#FFFFFF" />
              <Text style={s.ctaText}>ENVOYER LA DEMANDE PUSH</Text>
            </>
          ) : (
            <>
              <Link2 size={18} color="#FFFFFF" />
              <Text style={s.ctaText}>PARTAGER LE LIEN DE PAIEMENT</Text>
            </>
          )}
        </Pressable>

        {/* Error recovery */}
        {status === "error" ? (
          <Text style={[styles.errorText, { textAlign: "center" }]}>{errorMsg}</Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullScreen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  errorText: {
    color: "#E4002B",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
});

function makeStyles(G: GarageTheme) {
  const android = Platform.OS === "android" ? { includeFontPadding: false } : {};
  return StyleSheet.create({
    // Header
    header: {
      backgroundColor: G.green,
      paddingHorizontal: 20,
      paddingBottom: 14,
      gap: 2,
    },
    headerTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 22,
      color: "#FFFFFF",
      ...android,
    },
    headerSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "rgba(255,255,255,0.75)",
      ...android,
    },
    // Form
    fieldBlock: { gap: 8 },
    label: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      letterSpacing: 1,
      ...android,
    },
    textArea: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      minHeight: 80,
      ...android,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden",
    },
    amountInput: {
      flex: 1,
      fontFamily: "Inter_700Bold",
      fontSize: 28,
      paddingHorizontal: 16,
      paddingVertical: 14,
      ...android,
    },
    currencyBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      marginRight: 12,
    },
    currencyText: {
      fontFamily: "Inter_700Bold",
      fontSize: 13,
      ...android,
    },
    commissionHint: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      ...android,
    },
    // Mode tabs
    modeRow: { flexDirection: "row", gap: 10 },
    modeTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 12,
      borderWidth: 1.5,
      paddingVertical: 13,
    },
    modeTabText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      ...android,
    },
    // Phone
    phoneRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden",
    },
    prefixBox: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRightWidth: 1,
    },
    prefix: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      ...android,
    },
    phoneInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      paddingHorizontal: 14,
      paddingVertical: 14,
      ...android,
    },
    operatorBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 10,
    },
    // Info box
    infoBox: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
    },
    infoText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 20,
      ...android,
    },
    // CTA
    cta: {
      borderRadius: 16,
      paddingVertical: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    ctaText: {
      fontFamily: "Inter_700Bold",
      fontSize: 14,
      color: "#FFFFFF",
      letterSpacing: 0.6,
      ...android,
    },
    // Status card
    statusCard: {
      width: "100%",
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    // Pending
    pendingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "#EFF6FF",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      width: "100%",
    },
    pendingText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      flex: 1,
      ...android,
    },
    cancelBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 10,
      marginTop: 4,
    },
    cancelBtnText: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      ...android,
    },
    // QR
    qrAmountBig: {
      fontFamily: "Inter_700Bold",
      fontSize: 36,
      ...android,
    },
    qrDesc: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      textAlign: "center",
      ...android,
    },
    qrWrapper: {
      padding: 16,
      borderRadius: 16,
    },
    qrHint: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      ...android,
    },
    // Success
    successIcon: { marginBottom: 4 },
    successTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 26,
      color: "#22C55E",
      ...android,
    },
    successAmount: {
      fontFamily: "Inter_700Bold",
      fontSize: 36,
      ...android,
    },
    successDesc: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      textAlign: "center",
      ...android,
    },
    commissionBox: {
      width: "100%",
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      gap: 10,
      marginTop: 4,
    },
    commissionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    commissionLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      ...android,
    },
    commissionValue: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      ...android,
    },
    commissionDivider: { height: StyleSheet.hairlineWidth, width: "100%" },
    newInvoiceBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      marginTop: 8,
    },
    newInvoiceBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 14,
      color: "#FFFFFF",
      ...android,
    },
  });
}
