import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ProxyImage as Image } from "@/components/ProxyImage";
import { Camera, ImageIcon, Upload } from "lucide-react-native";
import { router } from "expo-router";
import { getImageUrl } from "@/lib/imageUrl";
import { useQueryClient } from "@tanstack/react-query";
import {
  DayHoursDay,
  RepairDelay,
  Specialty,
  useCreateGarage,
} from "@workspace/api-client-react";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { pickAndUploadImage, pickAndUploadMultipleImages } from "@/lib/uploadImage";
import { CongoPhoneInput, detectCongoOperator } from "@/components/CongoPhoneInput";
import {
  citiesWithNeighborhoods,
  cityList,
  dayLabels,
  repairDelayLabels,
  repairDelayOptions,
  specialtyLabels,
  specialtyOptions,
} from "@/constants/labels";

const STEPS = ["Informations", "Spécialités", "Horaires", "Photos", "Confirmation"];

const allDays = Object.keys(DayHoursDay) as (typeof DayHoursDay)[keyof typeof DayHoursDay][];

export default function GarageOnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const createGarage = useCreateGarage();

  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [city, setCity] = useState<string | undefined>(undefined);
  const [neighborhood, setNeighborhood] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);
  const [averageRepairDelay, setAverageRepairDelay] = useState<RepairDelay>(RepairDelay["1_3h"]);
  const [yearsExperience, setYearsExperience] = useState("");
  const [mechanicsCount, setMechanicsCount] = useState("");
  const [acceptedBrands, setAcceptedBrands] = useState("");

  const [closedDays, setClosedDays] = useState<Set<string>>(new Set(["dimanche"]));

  const [avatarImageUrl, setAvatarImageUrl] = useState<string | undefined>(undefined);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(undefined);
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const toggleSpecialty = (s: Specialty) => {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleClosedDay = (day: string) => {
    setClosedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const uploadSingle = async (setter: (url: string) => void, field: string, aspect?: [number, number]) => {
    try {
      setUploadingField(field);
      const url = await pickAndUploadImage({ allowsEditing: true, aspect });
      if (url) setter(url);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploadingField(null);
    }
  };

  const uploadGallery = async () => {
    try {
      setUploadingField("gallery");
      const urls = await pickAndUploadMultipleImages();
      setGalleryImageUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploadingField(null);
    }
  };

  const canProceedStep0 = name.trim() && neighborhood && address.trim() && phone.length === 9 && !!detectCongoOperator(phone);
  const canProceedStep1 = specialties.length > 0;

  const handleNext = () => {
    if (step === 0 && !canProceedStep0) {
      Alert.alert("Champs requis", "Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (step === 1 && !canProceedStep1) {
      Alert.alert("Spécialité requise", "Sélectionnez au moins une spécialité.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => s - 1);
  };

  const handleSubmit = () => {
    // Guard: if the session has expired, send the user back to login
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    createGarage.mutate(
      {
        data: {
          name: name.trim(),
          neighborhood: neighborhood!,
          address: address.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || undefined,
          description: description.trim() || undefined,
          coverImageUrl,
          avatarImageUrl,
          specialties,
          emergencyAvailable,
          averageRepairDelay,
          yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
          mechanicsCount: mechanicsCount ? Number(mechanicsCount) : undefined,
          acceptedBrands: acceptedBrands
            ? acceptedBrands.split(",").map((b) => b.trim()).filter(Boolean)
            : undefined,
          openingHours: allDays.map((day) => ({
            day,
            open: "08:00",
            close: "18:00",
            closed: closedDays.has(day),
          })),
          galleryImageUrls: galleryImageUrls.length ? galleryImageUrls : undefined,
        },
      },
      {
        onSuccess: () => {
          // Invalider le cache profil + garage pour que Mon Espace reflète
          // immédiatement le nouveau accountType "garage_pro".
          queryClient.invalidateQueries();
          Alert.alert("Bienvenue !", "Votre garage a été créé avec succès.");
          router.replace("/garage/dashboard");
        },
        onError: (error) => {
          // Log the full error detail for debugging
          // JSON.stringify(new Error()) returns {} — extract properties manually
          const apiErr = error as { status?: number; data?: { error?: string; message?: string; details?: string } };
          console.error("Erreur création garage:", JSON.stringify({
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            status: apiErr?.status,
            data: apiErr?.data,
          }, null, 2));

          // Surface the most specific message available
          const detail =
            apiErr?.data?.error ??
            apiErr?.data?.message ??
            apiErr?.data?.details ??
            (error instanceof Error ? error.message : undefined) ??
            "Erreur inconnue";

          Alert.alert("Erreur de création", detail);
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.progressRow}>
        {STEPS.map((label, idx) => (
          <View key={label} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                { backgroundColor: idx <= step ? colors.primary : colors.border },
              ]}
            />
            {idx < STEPS.length - 1 ? (
              <View style={[styles.progressLine, { backgroundColor: idx < step ? colors.primary : colors.border }]} />
            ) : null}
          </View>
        ))}
      </View>
      <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>
        Étape {step + 1} sur {STEPS.length} · {STEPS[step]}
      </Text>

      <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 16 }]} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <View style={{ gap: 14 }}>
            <Field label="Nom du garage *" value={name} onChangeText={setName} colors={colors} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Ville *</Text>
            <View style={styles.chipWrap}>
              {cityList.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { setCity(c); setNeighborhood(undefined); }}
                  style={[styles.optionChip, { backgroundColor: city === c ? colors.primary : colors.secondary }]}
                >
                  <Text style={{ color: city === c ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
            {city ? (
              <>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Quartier *</Text>
                <View style={styles.chipWrap}>
                  {citiesWithNeighborhoods[city].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setNeighborhood(n)}
                      style={[styles.optionChip, { backgroundColor: neighborhood === n ? colors.primary : colors.secondary }]}
                    >
                      <Text style={{ color: neighborhood === n ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Field label="Adresse *" value={address} onChangeText={setAddress} colors={colors} />
            <CongoPhoneInput
              value={phone}
              onChangeText={setPhone}
              label="Téléphone *"
              required
            />
            <CongoPhoneInput
              value={whatsapp}
              onChangeText={setWhatsapp}
              label="WhatsApp"
            />
            <Field label="Description" value={description} onChangeText={setDescription} colors={colors} multiline />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 18 }}>
            <View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Spécialités *</Text>
              <View style={styles.chipWrap}>
                {specialtyOptions.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => toggleSpecialty(s)}
                    style={[styles.optionChip, { backgroundColor: specialties.includes(s) ? colors.primary : colors.secondary }]}
                  >
                    <Text style={{ color: specialties.includes(s) ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {specialtyLabels[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Délai moyen de réparation</Text>
              <View style={styles.chipWrap}>
                {repairDelayOptions.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setAverageRepairDelay(d)}
                    style={[styles.optionChip, { backgroundColor: averageRepairDelay === d ? colors.primary : colors.secondary }]}
                  >
                    <Text style={{ color: averageRepairDelay === d ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {repairDelayLabels[d]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={styles.toggleRow} onPress={() => setEmergencyAvailable((v) => !v)}>
              <Text style={[styles.label, { color: colors.foreground, marginBottom: 0 }]}>Disponible pour urgences 24h/24</Text>
              <Switch value={emergencyAvailable} onValueChange={setEmergencyAvailable} trackColor={{ true: colors.primary, false: colors.border }} />
            </Pressable>

            <Field label="Années d'expérience" value={yearsExperience} onChangeText={setYearsExperience} colors={colors} keyboardType="number-pad" />
            <Field label="Nombre de mécaniciens" value={mechanicsCount} onChangeText={setMechanicsCount} colors={colors} keyboardType="number-pad" />
            <Field label="Marques acceptées (séparées par des virgules)" value={acceptedBrands} onChangeText={setAcceptedBrands} colors={colors} />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 4 }}>
            <Text style={[styles.label, { color: colors.mutedForeground, marginBottom: 12 }]}>
              Sélectionnez les jours de fermeture (horaires par défaut 08:00 - 18:00)
            </Text>
            {allDays.map((day) => (
              <Pressable
                key={day}
                onPress={() => toggleClosedDay(day)}
                style={[styles.dayRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.dayLabel, { color: colors.foreground }]}>{dayLabels[day]}</Text>
                <View style={[styles.dayStatus, { backgroundColor: closedDays.has(day) ? colors.destructive + "18" : colors.primary + "18" }]}>
                  <Text style={{ color: closedDays.has(day) ? colors.destructive : colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    {closedDays.has(day) ? "Fermé" : "08:00 - 18:00"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Photo de profil</Text>
              <Pressable
                onPress={() => uploadSingle(setAvatarImageUrl, "avatar", [1, 1])}
                style={[styles.avatarPicker, { backgroundColor: colors.secondary }]}
              >
                {uploadingField === "avatar" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : avatarImageUrl ? (
                  <Image source={{ uri: getImageUrl(avatarImageUrl) }} style={styles.avatarImage} />
                ) : (
                  <Camera size={22} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Photo de couverture</Text>
              <Pressable
                onPress={() => uploadSingle(setCoverImageUrl, "cover", [16, 9])}
                style={[styles.coverPicker, { backgroundColor: colors.secondary }]}
              >
                {uploadingField === "cover" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : coverImageUrl ? (
                  <Image source={{ uri: getImageUrl(coverImageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <ImageIcon size={24} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Galerie</Text>
              <Pressable
                onPress={uploadGallery}
                style={[styles.galleryPicker, { borderColor: colors.primary }]}
              >
                {uploadingField === "gallery" ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Upload size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Ajouter des photos</Text>
                  </>
                )}
              </Pressable>
              {galleryImageUrls.length ? (
                <View style={styles.galleryGrid}>
                  {galleryImageUrls.map((url) => (
                    <Image key={url} source={{ uri: getImageUrl(url) }} style={styles.galleryThumb} contentFit="cover" />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: 14 }}>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>{name}</Text>
            <Text style={[styles.confirmLine, { color: colors.mutedForeground }]}>{neighborhood} · {address}</Text>
            <Text style={[styles.confirmLine, { color: colors.mutedForeground }]}>{phone}</Text>
            <View style={styles.chipWrap}>
              {specialties.map((s) => (
                <View key={s} style={[styles.optionChip, { backgroundColor: colors.secondary }]}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 12 }}>{specialtyLabels[s]}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.confirmNote, { color: colors.mutedForeground }]}>
              Vérifiez vos informations avant de publier votre profil. Vous pourrez les modifier plus tard depuis Mon Espace.
            </Text>
          </View>
        ) : null}

        {/* Boutons — dans le scroll, collés sous le contenu */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable onPress={handleBack} style={[styles.footerButtonSecondary, { borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{step === 0 ? "Annuler" : "Retour"}</Text>
          </Pressable>
          {step < STEPS.length - 1 ? (
            <Pressable onPress={handleNext} style={[styles.footerButtonPrimary, { backgroundColor: colors.primary }]}>
              <Text style={styles.footerButtonPrimaryText}>Suivant</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={createGarage.isPending}
              style={[styles.footerButtonPrimary, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.footerButtonPrimaryText}>{createGarage.isPending ? "Publication…" : "Publier mon garage"}</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "number-pad";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          { backgroundColor: colors.secondary, color: colors.foreground, minHeight: multiline ? 80 : undefined },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 16 },
  progressItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressLine: { flex: 1, height: 2, marginHorizontal: 4 },
  stepLabel: { fontFamily: "Inter_500Medium", fontSize: 12, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  container: { padding: 20, paddingBottom: 40, gap: 4 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlignVertical: "top",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  dayStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  avatarPicker: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  coverPicker: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  galleryPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
  },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  galleryThumb: { width: 72, height: 72, borderRadius: 10 },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  confirmLine: { fontFamily: "Inter_400Regular", fontSize: 14 },
  confirmNote: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 8 },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButtonSecondary: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  footerButtonPrimary: {
    flex: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  footerButtonPrimaryText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
