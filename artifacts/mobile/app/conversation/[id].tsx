import React, { useEffect, useRef, useState } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Keyboard,
} from "react-native";
import { FileText, ImageIcon, Plus, Send, X } from "lucide-react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MessageType,
  useListConversations,
  useListMessages,
  useMarkConversationRead,
  useSendMessage,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { pickAndUploadImage } from "@/lib/uploadImage";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isImageUrl(content: string): boolean {
  return (
    content.startsWith("https://") &&
    (content.includes("/api/storage/") ||
      /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(content))
  );
}

// ── Attach menu ──────────────────────────────────────────────────────────────

type AttachItem = {
  icon: React.ReactNode;
  label: string;
  color: string;
  onPress: () => void;
};

function AttachMenu({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: AttachItem[];
}) {
  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 300, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[menuStyles.backdrop, { opacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[menuStyles.sheet, { transform: [{ translateY }] }]}>
              <View style={menuStyles.handle} />
              <View style={menuStyles.grid}>
                {items.map((item) => (
                  <Pressable
                    key={item.label}
                    style={menuStyles.item}
                    onPress={() => {
                      onClose();
                      setTimeout(item.onPress, 200);
                    }}
                  >
                    <View style={[menuStyles.iconCircle, { backgroundColor: item.color }]}>
                      {item.icon}
                    </View>
                    <Text style={menuStyles.itemLabel}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const conversationId = Number(id);
  const isPro = mode === "pro";
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState("");
  const listRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const conversations = useListConversations();
  const conversation = (conversations.data ?? []).find((c) => c.id === conversationId);

  const messages = useListMessages(conversationId, { query: { refetchInterval: 4000 } as never });
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  useEffect(() => {
    markRead.mutate({ conversationId }, { onSuccess: () => conversations.refetch() });
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    sendMessage.mutate(
      { conversationId, data: { type: MessageType.text, content } },
      { onSuccess: () => messages.refetch() },
    );
  };

  const handleRequestQuote = () => {
    setQuoteFormOpen(true);
  };

  const handleSubmitQuote = () => {
    const content = quoteDetails.trim();
    if (content.length < 10) {
      Alert.alert("Demande incomplète", "Décrivez votre besoin en au moins quelques mots.");
      return;
    }
    sendMessage.mutate(
      { conversationId, data: { type: MessageType.quote_request, content } },
      {
        onSuccess: () => {
          setQuoteDetails("");
          setQuoteFormOpen(false);
          messages.refetch();
        },
        onError: () => Alert.alert("Erreur", "La demande de devis n’a pas pu être envoyée."),
      },
    );
  };

  const handlePickPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadImage({ allowsEditing: false });
      if (!url) return;
      sendMessage.mutate(
        { conversationId, data: { type: MessageType.text, content: url } },
        { onSuccess: () => messages.refetch() },
      );
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const attachItems: AttachItem[] = [
    ...(!isPro
      ? [
          {
            icon: <FileText size={26} color="#FFFFFF" />,
            label: "Demander un devis",
            color: "#1D7159",
            onPress: handleRequestQuote,
          } satisfies AttachItem,
        ]
      : []),
    ...(isPro
      ? [
          {
            icon: <FileText size={26} color="#FFFFFF" />,
            label: "Créer une facture",
            color: "#1D7159",
            onPress: () => router.push({ pathname: "/(garage)/invoice", params: { conversationId: String(conversationId) } }),
          } satisfies AttachItem,
        ]
      : []),
    {
      icon: uploadingPhoto ? (
        <ActivityIndicator size={22} color="#FFFFFF" />
      ) : (
        <ImageIcon size={26} color="#FFFFFF" />
      ),
      label: "Envoyer une photo",
      color: "#2563EB",
      onPress: handlePickPhoto,
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable
              onPress={() =>
                conversation?.garageId
                  ? router.push({ pathname: "/garage/[id]", params: { id: conversation.garageId } })
                  : undefined
              }
              hitSlop={10}
              style={{ alignItems: "center" }}
            >
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 17, color: colors.foreground }}>
                {conversation?.garageName ?? "Conversation"}
              </Text>
              {conversation?.garageId ? (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.primary }}>
                  Voir le profil
                </Text>
              ) : null}
            </Pressable>
          ),
        }}
      />
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {messages.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={messages.data ?? []}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 + keyboardHeight, gap: 8 }}
            renderItem={({ item }) => {
              const mine = item.senderId === user?.id;
              const isImage = isImageUrl(item.content);
              return (
                <View style={[styles.bubbleRow, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isImage ? "transparent" : mine ? colors.primary : colors.secondary,
                        borderBottomRightRadius: mine ? 4 : 16,
                        borderBottomLeftRadius: mine ? 16 : 4,
                        padding: isImage ? 0 : undefined,
                      },
                    ]}
                  >
                    {isImage ? (
                      <Pressable onPress={() => setFullscreenImage(item.content)}>
                        <Image
                          source={{ uri: getImageUrl(item.content) }}
                          style={styles.chatImage}
                          resizeMode="cover"
                        />
                        <Text
                          style={[
                            styles.bubbleTime,
                            { color: colors.mutedForeground, paddingHorizontal: 6, paddingBottom: 4 },
                          ]}
                        >
                          {formatTime(item.createdAt)}
                        </Text>
                      </Pressable>
                    ) : (
                      <>
                        <Text style={{ color: mine ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                          {item.content}
                        </Text>
                        <Text
                          style={[
                            styles.bubbleTime,
                            { color: mine ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
                          ]}
                        >
                          {formatTime(item.createdAt)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              );
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input bar */}
        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          enabled
          style={[styles.keyboardComposer, { backgroundColor: colors.background }]}
        >
        <View style={[styles.inputRow, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>

          {/* + attach button */}
          <Pressable
            onPress={() => setAttachOpen(true)}
            style={[styles.plusButton, { backgroundColor: "transparent" }]}
          >
            <Plus size={20} color={colors.primary} strokeWidth={2.5} />
          </Pressable>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Écrivez un message…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.input, color: colors.secondaryForeground, opacity: 1 }]}
            multiline
            textAlignVertical="top"
            returnKeyType="send"
            blurOnSubmit={false}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120)}
            accessibilityLabel="Écrire un message"
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            style={[styles.sendButton, { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.5 }]}
          >
            <Send size={17} color="#FFFFFF" />
          </Pressable>
        </View>
        </KeyboardStickyView>

        {/* Attach menu */}
        <AttachMenu
          visible={attachOpen}
          onClose={() => setAttachOpen(false)}
          items={attachItems}
        />

        {/* Demande de devis */}
        <Modal
          visible={quoteFormOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setQuoteFormOpen(false)}
        >
          <KeyboardAwareScrollViewCompat
            style={styles.modalBackdrop}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.quoteSheet, { backgroundColor: colors.card }]}>
              <View style={styles.quoteHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quoteTitle, { color: colors.foreground }]}>Demander un devis</Text>
                  <Text style={[styles.quoteSubtitle, { color: colors.mutedForeground }]}>Décrivez le problème de votre véhicule au pro.</Text>
                </View>
                <Pressable onPress={() => setQuoteFormOpen(false)} accessibilityRole="button" accessibilityLabel="Fermer la demande de devis">
                  <X size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <TextInput
                value={quoteDetails}
                onChangeText={setQuoteDetails}
                placeholder="Exemple : Toyota Corolla 2015, bruit au freinage…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
                style={[styles.quoteInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                accessibilityLabel="Description de votre demande de devis"
              />
              <View style={styles.quoteFormActions}>
                <Pressable onPress={() => setQuoteFormOpen(false)} style={[styles.cancelButton, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitQuote}
                  disabled={sendMessage.isPending}
                  style={[styles.submitButton, { backgroundColor: colors.primary, opacity: sendMessage.isPending ? 0.6 : 1 }]}
                >
                  <Text style={styles.submitButtonText}>{sendMessage.isPending ? "Envoi…" : "Envoyer la demande"}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAwareScrollViewCompat>
        </Modal>

        {/* Fullscreen image */}
        <Modal visible={!!fullscreenImage} transparent animationType="fade" statusBarTranslucent>
          <TouchableWithoutFeedback onPress={() => setFullscreenImage(null)}>
            <View style={styles.fullscreenOverlay}>
              {fullscreenImage ? (
                <Image source={{ uri: getImageUrl(fullscreenImage) }} style={styles.fullscreenImage} resizeMode="contain" />
              ) : null}
              <Pressable onPress={() => setFullscreenImage(null)} style={styles.fullscreenClose}>
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  quoteSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  quoteHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  quoteTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  quoteSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 4 },
  quoteInput: { minHeight: 130, borderRadius: 14, padding: 14, fontFamily: "Inter_400Regular", fontSize: 14 },
  quoteFormActions: { flexDirection: "row", gap: 10 },
  cancelButton: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  cancelButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  submitButton: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  bubbleRow: { flexDirection: "row" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    overflow: "hidden",
  },
  chatImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  keyboardComposer: { width: "100%", flexShrink: 0, zIndex: 10, elevation: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 0,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    flexShrink: 1,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 21,
    maxHeight: 120,
    includeFontPadding: true,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
  fullscreenClose: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
  },
  item: {
    alignItems: "center",
    gap: 10,
    minWidth: 80,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
  },
});
