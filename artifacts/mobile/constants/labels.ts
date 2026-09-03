import type { RepairDelay, Specialty } from "@workspace/api-client-react";

export const specialtyLabels: Record<Specialty, string> = {
  moteur: "Moteur",
  carrosserie: "Carrosserie",
  electrique: "Électrique",
  climatisation: "Climatisation",
  transmission: "Transmission",
  freins: "Freins",
  suspension: "Suspension",
  pneus: "Pneus",
  geometrie: "Géométrie",
  depannage_urgence: "Dépannage urgence",
  vidange_revision: "Vidange & Révision",
  diagnostic_electronique: "Diagnostic Électronique / Valise",
  batterie_alternateur: "Batterie & Alternateur",
  vitrage_pare_brise: "Vitrage & Pare-brise",
  echappement_antipollution: "Échappement & Anti-pollution",
  lavage_detailing: "Lavage & Detailing",
  cles_antidemarrage: "Clés & Anti-démarrage",
  injection_carburation: "Injection & Carburation",
};

export const specialtyOptions = Object.keys(specialtyLabels) as Specialty[];

export const repairDelayLabels: Record<RepairDelay, string> = {
  moins_1h: "Moins d'1h",
  "1_3h": "1 à 3h",
  "3_6h": "3 à 6h",
  "1_jour": "1 jour",
  plusieurs_jours: "Plusieurs jours",
};

export const repairDelayOptions = Object.keys(repairDelayLabels) as RepairDelay[];

export const citiesWithNeighborhoods: Record<string, string[]> = {
  "Brazzaville": [
    "Bacongo",
    "Poto-Poto",
    "Moungali",
    "Ouenzé",
    "Talangaï",
    "Mfilou",
    "Makélékélé",
    "Madibou",
  ],
  "Pointe-Noire": [
    "Lumumba",
    "Tié-Tié",
    "Ngoyo",
    "Mvou-Mvou",
    "Mongo-Mpoukou",
    "Vindoulou",
    "Loandjili",
  ],
  "Dolisie": [
    "Centre-ville",
    "Kimba",
    "Mougoundou-Nord",
    "Mougoundou-Sud",
    "Makayabou",
  ],
};

export const cityList = Object.keys(citiesWithNeighborhoods);

// Flat list of all neighborhoods (all cities combined) — kept for backward compat
export const neighborhoods = Object.values(citiesWithNeighborhoods).flat();

export const dayLabels: Record<string, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};
