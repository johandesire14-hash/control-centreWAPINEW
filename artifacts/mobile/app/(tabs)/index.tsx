import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProxyImage as Image } from "@/components/ProxyImage";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bell, Wrench, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetMyProfile,
  useListCertifiedGarages,
  useListTopRatedGarages,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { GarageCard } from "@/components/GarageCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;
const AUTO_SLIDE_INTERVAL = 3000;

const CAROUSEL_ITEMS = [
  { id: "1", image: require("@/assets/images/carousel-1.png") as number },
  { id: "2", image: require("@/assets/images/carousel-2.png") as number },
  { id: "3", image: require("@/assets/images/carousel-3.png") as number },
];

function HomeCarousel({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * CARD_WIDTH, animated: true });
    setActiveIndex(index);
  };

  const startAutoSlide = () => {
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % CAROUSEL_ITEMS.length;
        scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);
  };

  useEffect(() => {
    startAutoSlide();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / CARD_WIDTH);
    if (index !== activeIndex) setActiveIndex(index);
  };

  const pauseAndResume = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(startAutoSlide, AUTO_SLIDE_INTERVAL * 2);
  };

  return (
    <View style={styles.carouselWrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={pauseAndResume}
      >
        {CAROUSEL_ITEMS.map((item) => (
          <View key={item.id} style={[styles.carouselCard, { width: CARD_WIDTH }]}>
            <Image
              source={item.image}
              style={styles.carouselImage}
              contentFit="cover"
            />
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {CAROUSEL_ITEMS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? colors.primary : colors.border,
                width: i === activeIndex ? 20 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function AccueilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();

  const topRated = useListTopRatedGarages({ limit: 8 });
  const certified = useListCertifiedGarages({ limit: 8 });
  const profile = useGetMyProfile({ query: { enabled: isAuthenticated } as never });

  useFocusEffect(
    useCallback(() => {
      topRated.refetch();
      certified.refetch();
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const refreshing = topRated.isRefetching || certified.isRefetching;
  const onRefresh = () => {
    topRated.refetch();
    certified.refetch();
  };

  const firstName = isAuthenticated && user?.firstName ? user.firstName : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header fixe ───────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <View style={styles.greetingBlock}>
            <Text style={[styles.greetingSmall, { color: "rgba(255,255,255,0.75)" }]}>
              {Platform.OS === 'android' ? 'Bienvenue' : 'Bienvenue 👋'}
            </Text>
            <Text style={[styles.greetingName, { color: "#FFFFFF" }]} numberOfLines={1}>
              {firstName ?? "WapiGarage"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {!isAuthenticated ? (
              <Pressable
                onPress={() => router.push("/auth")}
                style={[styles.loginPill, { backgroundColor: "rgba(255,255,255,0.9)" }]}
                hitSlop={6}
              >
                <Text style={[styles.loginPillText, { color: colors.primary }]}>Connexion</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/notifications")}
                style={[styles.iconButton, { backgroundColor: "rgba(255,255,255,0.2)" }]}
                hitSlop={6}
              >
                <Bell size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ── Contenu scrollable ────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Carrousel ─────────────────────────────────────────── */}
        <HomeCarousel colors={colors} />

        {/* ── Les mieux notés ───────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Les mieux notés</Text>
            <Pressable onPress={() => router.push("/(tabs)/search")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Voir tout</Text>
            </Pressable>
          </View>
          <FlatList
            data={topRated.data ?? []}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item.id?.toString() ?? `top-rated-${index}`}
            contentContainerStyle={{ gap: 14, paddingRight: 20 }}
            renderItem={({ item }) => (
              <View style={{ width: 230 }}>
                <GarageCard garage={item} />
              </View>
            )}
          />
        </View>

        {/* ── Garages certifiés ─────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Garages certifiés</Text>
            <Pressable onPress={() => router.push("/(tabs)/search")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Voir tout</Text>
            </Pressable>
          </View>
          <FlatList
            data={certified.data ?? []}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item.id?.toString() ?? `certified-${index}`}
            contentContainerStyle={{ gap: 14, paddingRight: 20 }}
            renderItem={({ item }) => (
              <View style={{ width: 230 }}>
                <GarageCard garage={item} />
              </View>
            )}
          />
        </View>

        {/* ── Pro Banner ────────────────────────────────────────── */}
        {!isAuthenticated || profile.data?.accountType !== "garage_pro" ? (
          <Pressable
            onPress={() => router.push(isAuthenticated ? "/onboarding/garage" : "/auth")}
            style={[styles.proBanner, { backgroundColor: colors.tabBar }]}
          >
            <View style={[styles.proBannerIcon, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Wrench size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proBannerTitle}>Vous êtes un professionnel ?</Text>
              <Text style={styles.proBannerText}>Inscrivez votre garage sur WapiGarage</Text>
            </View>
            <ChevronRight size={22} color="rgba(255,255,255,0.6)" />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  greetingBlock: {
    flex: 1,
    gap: 2,
  },
  greetingSmall: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  greetingName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  loginPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
  loginPillText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    fontSize: 13,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  // Carousel
  carouselWrapper: {
    marginTop: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  carouselCard: {
    borderRadius: 20,
    overflow: "hidden",
    height: 200,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  // Sections
  sectionBlock: {
    marginTop: 10,
    gap: 14,
    paddingVertical: 18,
    paddingLeft: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  seeAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  proBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  proBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  proBannerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  proBannerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
});
