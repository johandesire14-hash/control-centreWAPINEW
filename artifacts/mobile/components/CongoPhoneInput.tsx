/**
 * CongoPhoneInput — Saisie standardisée pour numéros Congo 🇨🇬 (+242)
 *
 * Règles opérateur STRICTES :
 *   06 → MTN MOMO      (badge jaune)
 *   05 → AIRTEL MONEY  (badge rouge)
 *   autres → Invalide  (badge gris)
 *
 * `value`        : 9 chiffres locaux (ex: "066000000") ou format +242XXXXXXXXX
 * `onChangeText` : renvoie toujours 9 chiffres locaux nettoyés
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PhoneInput — Saisie multi-pays avec sélecteur d'indicatif
 *
 * Supporte : Congo 🇨🇬 (+242) et France 🇫🇷 (+33)
 *
 * `value`        : numéro au format international (+242XXXXXXXXX / +33XXXXXXXXX) ou ""
 * `onChangeText` : renvoie le numéro au format international, ou "" si vide
 */
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CongoOperator = "MTN_MOMO_COG" | "AIRTEL_COG";

export interface CongoPhoneValidation {
  valid: boolean;
  error?: string;
  /** Format international "+242XXXXXXXXX" quand valide */
  international?: string;
}

// ── Utilitaires CongoPhoneInput (exportés pour réutilisation) ──────────────────

/** Supprime le préfixe +242 / espaces / tirets et retourne au max 9 chiffres. */
export function normalizeCongoPhone(value: string): string {
  return value
    .replace(/[\s\-]/g, "")
    .replace(/^\+?242/, "")
    .replace(/\D/g, "")
    .slice(0, 9);
}

/** 06 → MTN MoMo  |  05 → Airtel  |  null = préfixe non supporté */
export function detectCongoOperator(localDigits: string): CongoOperator | null {
  if (localDigits.startsWith("06")) return "MTN_MOMO_COG";
  if (localDigits.startsWith("05")) return "AIRTEL_COG";
  return null;
}

/** Convertit un CongoOperator en code API ("MTN" | "AIRTEL"). */
export function toCongoApiProvider(op: CongoOperator): "MTN" | "AIRTEL" {
  return op === "MTN_MOMO_COG" ? "MTN" : "AIRTEL";
}

/**
 * Validation complète :
 *  - exactement 9 chiffres
 *  - préfixe 06 (MTN) ou 05 (Airtel) obligatoire
 */
export function validateCongoPhone(value: string): CongoPhoneValidation {
  const digits = normalizeCongoPhone(value);
  if (!/^\d{9}$/.test(digits)) {
    return {
      valid: false,
      error: "Le numéro doit contenir exactement 9 chiffres (ex: 066000000).",
    };
  }
  const op = detectCongoOperator(digits);
  if (!op) {
    return {
      valid: false,
      error: "Préfixe non supporté. Utilisez 06 (MTN MoMo) ou 05 (Airtel Money).",
    };
  }
  return { valid: true, international: `+242${digits}` };
}

// ── CongoPhoneInput ────────────────────────────────────────────────────────────

interface CongoPhoneInputProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Libellé affiché au-dessus du champ */
  label?: string;
  /** Ajoute " *" au libellé si true */
  required?: boolean;
  containerStyle?: ViewStyle;
}

const MTN_BG = "#FFF9DB";
const MTN_COLOR = "#B8860B";
const AIRTEL_BG = "#FFF0F0";
const AIRTEL_COLOR = "#E4002B";
const INVALID_BG = "#F3F4F6";
const INVALID_COLOR = "#9CA3AF";

export function CongoPhoneInput({
  value,
  onChangeText,
  label,
  required,
  containerStyle,
}: CongoPhoneInputProps) {
  const colors = useColors();
  const digits = normalizeCongoPhone(value);
  const operator = detectCongoOperator(digits);

  // Badge
  let badgeBg: string | undefined;
  let badgeColor: string | undefined;
  let badgeLabel: string | undefined;

  if (digits.length >= 2) {
    if (operator === "MTN_MOMO_COG") {
      badgeBg = MTN_BG; badgeColor = MTN_COLOR; badgeLabel = "MTN MOMO";
    } else if (operator === "AIRTEL_COG") {
      badgeBg = AIRTEL_BG; badgeColor = AIRTEL_COLOR; badgeLabel = "AIRTEL MONEY";
    } else {
      badgeBg = INVALID_BG; badgeColor = INVALID_COLOR; badgeLabel = "Invalide";
    }
  }

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[sharedStyles.label, { color: colors.mutedForeground }]}>
          {label}{required ? " *" : ""}
        </Text>
      ) : null}
      <View
        style={[
          sharedStyles.row,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <View style={[sharedStyles.prefixBox, { borderRightColor: colors.border }]}>
          <Text style={[sharedStyles.prefixText, { color: colors.foreground }]}>
            🇨🇬 +242
          </Text>
        </View>
        <TextInput
          style={[sharedStyles.input, { color: colors.foreground }]}
          placeholder="066000000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          maxLength={9}
          value={digits}
          onChangeText={(v) => onChangeText(v.replace(/\D/g, "").slice(0, 9))}
        />
        {badgeBg && badgeLabel ? (
          <View style={[sharedStyles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[sharedStyles.badgeText, { color: badgeColor }]}>
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── PhoneInput (multi-pays : Congo + France) ───────────────────────────────────

type CountryCode = "CG" | "FR";

interface CountryDef {
  code: CountryCode;
  dialCode: string;
  flag: string;
  placeholder: string;
  /** Nombre de chiffres attendus dans le champ local */
  maxDigits: number;
}

const COUNTRIES: CountryDef[] = [
  { code: "CG", dialCode: "+242", flag: "🇨🇬", placeholder: "066000000",  maxDigits: 9  },
  { code: "FR", dialCode: "+33",  flag: "🇫🇷", placeholder: "0758448014", maxDigits: 10 },
];

/**
 * Reconstruit les chiffres locaux et le pays à partir d'une valeur internationale stockée.
 * Ex : "+242066000000" → { country: CG, local: "066000000" }
 *      "+33758448014"  → { country: FR, local: "0758448014" }
 *      "066000000"     → { country: CG, local: "066000000" }  (rétrocompat 9 chiffres bruts)
 */
function parseInternational(value: string): { country: CountryDef; local: string } {
  const cg = COUNTRIES[0]!;
  const fr = COUNTRIES[1]!;

  if (value.startsWith("+33")) {
    // France : +33758448014 → local = 0 + reste
    const rest = value.slice(3).replace(/\D/g, "").slice(0, 10);
    const local = rest.startsWith("0") ? rest : `0${rest}`;
    return { country: fr, local: local.slice(0, 10) };
  }
  if (value.startsWith("+242") || value.startsWith("242")) {
    const rest = value.replace(/^\+?242/, "").replace(/\D/g, "").slice(0, 9);
    return { country: cg, local: rest };
  }
  // Fallback : on suppose Congo, chiffres bruts (rétrocompat)
  const digits = value.replace(/\D/g, "").slice(0, 9);
  return { country: cg, local: digits };
}

/**
 * Convertit les chiffres locaux en numéro international.
 * France : "0758448014" → "+33758448014"  (on supprime le 0 initial)
 * Congo  : "066000000"  → "+242066000000"
 */
function toInternational(country: CountryDef, local: string): string {
  if (!local) return "";
  if (country.code === "FR") {
    const digits = local.replace(/\D/g, "");
    const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
    return `${country.dialCode}${withoutLeadingZero}`;
  }
  return `${country.dialCode}${local.replace(/\D/g, "")}`;
}

export interface PhoneInputProps {
  value: string;
  onChangeText: (international: string) => void;
  label?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * PhoneInput — saisie téléphone avec sélecteur de pays (Congo 🇨🇬 / France 🇫🇷).
 *
 * Renvoie via `onChangeText` le numéro au format international (ex: "+33758448014").
 * Accepte en `value` un numéro international stocké ou une chaîne vide.
 */
export function PhoneInput({
  value,
  onChangeText,
  label,
  required,
  containerStyle,
}: PhoneInputProps) {
  const colors = useColors();

  const parsed = parseInternational(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryDef>(parsed.country);
  const [localDigits, setLocalDigits]         = useState<string>(parsed.local);
  const [pickerOpen, setPickerOpen]           = useState(false);

  const handleDigitsChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "").slice(0, selectedCountry.maxDigits);
    setLocalDigits(cleaned);
    onChangeText(toInternational(selectedCountry, cleaned));
  };

  const handleCountrySelect = (country: CountryDef) => {
    setSelectedCountry(country);
    setLocalDigits("");
    onChangeText("");
    setPickerOpen(false);
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[sharedStyles.label, { color: colors.mutedForeground }]}>
          {label}{required ? " *" : ""}
        </Text>
      ) : null}

      <View
        style={[
          sharedStyles.row,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        {/* ── Country picker trigger ── */}
        <Pressable
          onPress={() => setPickerOpen((o) => !o)}
          style={[sharedStyles.prefixBox, { borderRightColor: colors.border }]}
          hitSlop={8}
        >
          <Text style={[sharedStyles.prefixText, { color: colors.foreground }]}>
            {selectedCountry.flag} {selectedCountry.dialCode} ▾
          </Text>
        </Pressable>

        {/* ── Local number input ── */}
        <TextInput
          style={[sharedStyles.input, { color: colors.foreground }]}
          placeholder={selectedCountry.placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          maxLength={selectedCountry.maxDigits}
          value={localDigits}
          onChangeText={handleDigitsChange}
        />
      </View>

      {/* ── Inline country dropdown ── */}
      {pickerOpen && (
        <View
          style={[
            pickerStyles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {COUNTRIES.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => handleCountrySelect(c)}
              style={[
                pickerStyles.option,
                c.code === selectedCountry.code && { backgroundColor: colors.secondary },
              ]}
            >
              <Text style={[pickerStyles.optionText, { color: colors.foreground }]}>
                {c.flag}{"  "}{c.dialCode}{"  "}
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  {c.code === "CG" ? "Congo" : "France"}
                </Text>
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles partagés ────────────────────────────────────────────────────────────

const sharedStyles = StyleSheet.create({
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 6,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRightWidth: 1,
  },
  prefixText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  badge: {
    marginRight: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});

const pickerStyles = StyleSheet.create({
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
