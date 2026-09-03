import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronUp, ChevronDown } from "lucide-react-native";

import { useColors } from "@/hooks/useColors";

const FAQ_ITEMS = [
  {
    question: "Comment créer mon compte ?",
    answer:
      "Appuyez sur « Continuer avec Google » sur l'écran de connexion. Votre compte est créé automatiquement avec votre adresse Gmail, sans mot de passe à retenir.",
  },
  {
    question: "Comment contacter un garage ?",
    answer:
      "Ouvrez la fiche d'un garage et appuyez sur le bouton « Contacter ». Un fil de discussion privé s'ouvre directement entre vous et le garage.",
  },
  {
    question: "Comment laisser un avis ?",
    answer:
      "Rendez-vous sur la fiche du garage, onglet « Avis », puis appuyez sur « Laisser un avis ». Attribuez une note de 1 à 5 étoiles et rédigez votre commentaire.",
  },
  {
    question: "Comment devenir garage pro ?",
    answer:
      "Dans l'onglet « Mon Espace », appuyez sur « Devenir Garage Pro » et remplissez les informations de votre établissement (nom, localisation, spécialités, etc.).",
  },
  {
    question: "Comment modifier mon profil ?",
    answer:
      "Accédez à « Mon Espace » puis « Paramètres ». Vous pouvez y modifier votre prénom, nom et numéro de téléphone, puis appuyez sur « Enregistrer ».",
  },
  {
    question: "Comment supprimer mon compte ?",
    answer:
      "Pour supprimer définitivement votre compte, contactez notre support à support@wapigarage.cg. La suppression est irréversible et entraîne la perte de toutes vos données.",
  },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.item, { borderColor: colors.border }]}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.itemHeader}
      >
        <Text style={[styles.question, { color: colors.foreground, flex: 1 }]}>{question}</Text>
        {open
          ? <ChevronUp size={18} color={colors.mutedForeground} />
          : <ChevronDown size={18} color={colors.mutedForeground} />}
      </Pressable>
      {open ? (
        <Text style={[styles.answer, { color: colors.mutedForeground }]}>{answer}</Text>
      ) : null}
    </View>
  );
}

export default function FaqScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Vous avez une question ? Retrouvez les réponses aux questions les plus fréquentes ci-dessous.
      </Text>
      {FAQ_ITEMS.map((item) => (
        <AccordionItem key={item.question} question={item.question} answer={item.answer} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, gap: 2 },
  intro: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  question: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  answer: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    paddingBottom: 16,
  },
});
