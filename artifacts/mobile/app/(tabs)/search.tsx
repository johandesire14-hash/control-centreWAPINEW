import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Search, X, SlidersHorizontal, LocateFixed } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListGarages, ListGaragesSort, type Specialty } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { GarageCard } from "@/components/GarageCard";
import { EmptyState } from "@/components/EmptyState";
import { citiesWithNeighborhoods, cityList, specialtyLabels, specialtyOptions } from "@/constants/labels";
import { requestUserLocation, type UserLocation } from "@/lib/location";

const sortOptions: { value: (typeof ListGaragesSort)[keyof typeof ListGaragesSort]; label: string }[] = [
  { value: ListGaragesSort.rating, label: "Mieux notés" },
  { value: ListGaragesSort.reviews, label: "Plus d'avis" },
  { value: ListGaragesSort.recent, label: "Plus récents" },
];

export default function RechercheScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ specialty?: string }>();

  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | undefined>(params.specialty as Specialty | undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [neighborhood, setNeighborhood] = useState<string | undefined>(undefined);
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sort, setSort] = useState<(typeof ListGaragesSort)[keyof typeof ListGaragesSort]>(ListGaragesSort.rating);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "granted" | "denied" | "error">("idle");

  const handleRequestLocation = async () => {
    setLocationState("loading");
    try {
      const location = await requestUserLocation();
      if (!location) {
        setLocationState("denied");
        return;
      }
      setUserLocation(location);
      setLocationState("granted");
    } catch {
      setLocationState("error");
    }
  };

  const garages = useListGarages({
    q: query || undefined,
    specialty,
    neighborhood,
    certifiedOnly: certifiedOnly || undefined,
    emergencyOnly: emergencyOnly || undefined,
    sort,
  });

  const activeFilterCount = useMemo(
    () => [specialty, neighborhood, certifiedOnly, emergencyOnly].filter(Boolean).length,
    [specialty, neighborhood, certifiedOnly, emergencyOnly],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.headerBlock, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.header, { color: "#FFFFFF" }]}>Recherche</Text>

        <View style={styles.searchRow}>
          <View style={[styles.searchInput, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Search size={16} color="rgba(255,255,255,0.8)" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Nom, quartier, spécialité…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={[styles.input, { color: "#FFFFFF" }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <X size={15} color="rgba(255,255,255,0.8)" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={[styles.filterButton, { backgroundColor: activeFilterCount > 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)" }]}
          >
            <SlidersHorizontal size={16} color="#FFFFFF" />
            {activeFilterCount > 0 ? (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Sort chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {sortOptions.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setSort(opt.value)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: sort === opt.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                },
              ]}
            >
              <Text
                style={[
                  styles.sortChipText,
                  { color: sort === opt.value ? colors.primary : "#FFFFFF" },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
                </ScrollView>
        <Pressable
          onPress={handleRequestLocation}
          disabled={locationState === "loading"}
          accessibilityRole="button"
          accessibilityLabel="Partager ma position pour trouver les garages proches"
          style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}
        >
          <LocateFixed size={16} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
            {locationState === "loading"
              ? "Recherche de votre position…"
              : locationState === "granted"
                ? "Position utilisée pour la recherche"
                : "Utiliser ma position"}
          </Text>
        </Pressable>
        {locationState === "denied" || locationState === "error" ? (
          <Text style={{ color: "#FFE2E2", fontSize: 12, marginTop: 6 }}>
            La position n’est pas disponible. Vous pouvez continuer avec la recherche par ville ou quartier.
          </Text>
        ) : null}
      </View>
      {/* ── Results ── */}
      <FlatList
        data={garages.data ?? []}
        keyExtractor={(item, index) => item.id?.toString() ?? `search-${index}`}
        numColumns={1}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl refreshing={garages.isRefetching} onRefresh={() => garages.refetch()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          garages.isLoading ? null : (
            <EmptyState icon={Search} title="Aucun garage trouvé" description="Essayez d'autres filtres ou un autre quartier." />
          )
        }
        renderItem={({ item }) => <GarageCard garage={item} />}
      />

      {/* ── Filters Modal ── */}
      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Filtres</Text>
              <Pressable
                onPress={() => setFiltersOpen(false)}
                hitSlop={8}
                style={[styles.closeButton, { backgroundColor: colors.secondary }]}
              >
                <X size={16} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 22 }} showsVerticalScrollIndicator={false}>
              <View>
                <Text style={[styles.filterLabel, { color: colors.foreground }]}>Spécialité</Text>
                <View style={styles.chipWrap}>
                  {specialtyOptions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSpecialty(specialty === s ? undefined : s)}
                      style={[
                        styles.optionChip,
                        { backgroundColor: specialty === s ? colors.tabBar : colors.secondary },
                      ]}
                    >
                      <Text style={{ color: specialty === s ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                        {specialtyLabels[s]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={[styles.filterLabel, { color: colors.foreground }]}>Ville</Text>
                <View style={styles.chipWrap}>
                  {cityList.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => {
                        setCity(city === c ? undefined : c);
                        setNeighborhood(undefined);
                      }}
                      style={[styles.optionChip, { backgroundColor: city === c ? colors.tabBar : colors.secondary }]}
                    >
                      <Text style={{ color: city === c ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={[styles.filterLabel, { color: colors.foreground }]}>Quartier</Text>
                <View style={styles.chipWrap}>
                  {(city ? citiesWithNeighborhoods[city] : Object.values(citiesWithNeighborhoods).flat()).map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setNeighborhood(neighborhood === n ? undefined : n)}
                      style={[
                        styles.optionChip,
                        { backgroundColor: neighborhood === n ? colors.tabBar : colors.secondary },
                      ]}
                    >
                      <Text style={{ color: neighborhood === n ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable style={styles.toggleRow} onPress={() => setCertifiedOnly((v) => !v)}>
                <Text style={[styles.filterLabel, { color: colors.foreground, marginBottom: 0 }]}>Certifié uniquement</Text>
                <View style={[
                  styles.toggleTrack,
                  { backgroundColor: certifiedOnly ? colors.primary : colors.secondary }
                ]}>
                  <View style={[styles.toggleThumb, certifiedOnly && styles.toggleThumbOn]} />
                </View>
              </Pressable>

              <Pressable style={styles.toggleRow} onPress={() => setEmergencyOnly((v) => !v)}>
                <Text style={[styles.filterLabel, { color: colors.foreground, marginBottom: 0 }]}>Urgence 24h/24</Text>
                <View style={[
                  styles.toggleTrack,
                  { backgroundColor: emergencyOnly ? colors.primary : colors.secondary }
                ]}>
                  <View style={[styles.toggleThumb, emergencyOnly && styles.toggleThumbOn]} />
                </View>
              </Pressable>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setSpecialty(undefined);
                  setCity(undefined);
                  setNeighborhood(undefined);
                  setCertifiedOnly(false);
                  setEmergencyOnly(false);
                }}
                style={[styles.resetButton, { backgroundColor: colors.secondary }]}
              >
                <Text style={[styles.resetButtonText, { color: colors.foreground }]}>Réinitialiser</Text>
              </Pressable>
              <Pressable onPress={() => setFiltersOpen(false)} style={[styles.applyButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.applyButtonText}>Voir les résultats</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  header: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCount: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#E4B93A",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: {
    fontSize: 10,
    color: "#1A2E27",
    fontFamily: "Inter_600SemiBold",
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
  sortChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 12,
    maxHeight: "88%",
    gap: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5EA",
    alignSelf: "center",
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  resetButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  applyButton: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
