#!/bin/bash
# =============================================================================
# WapiGarage — Setup Check
# Vérifie que toutes les variables d'environnement requises sont configurées.
# Ce script est exécuté au démarrage du projet.
# =============================================================================

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

MISSING=0

check_var() {
  local name="$1"
  local description="$2"
  local where="$3"
  local value="${!name}"

  if [ -z "$value" ]; then
    echo -e "  ${RED}✗${RESET} ${BOLD}${name}${RESET}"
    echo -e "    ${YELLOW}→${RESET} ${description}"
    echo -e "    ${YELLOW}→${RESET} Où le trouver : ${where}"
    echo ""
    MISSING=$((MISSING + 1))
  else
    echo -e "  ${GREEN}✓${RESET} ${name}"
  fi
}

echo ""
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${BOLD}   WapiGarage — Vérification de la config  ${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo ""

echo -e "${BOLD}── Base de données ──${RESET}"
check_var "SUPABASE_DATABASE_URL" \
  "Connection string PostgreSQL Supabase (port 6543, mode transaction)" \
  "Supabase Dashboard → Settings → Database → Connection string → Transaction pooler"

echo -e "${BOLD}── Stockage / API Supabase ──${RESET}"
check_var "EXPO_PUBLIC_SUPABASE_URL" \
  "URL de votre projet Supabase (ex: https://xxxx.supabase.co)" \
  "Supabase Dashboard → Settings → API → Project URL"

check_var "EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  "Clé publique anon Supabase" \
  "Supabase Dashboard → Settings → API → anon / public key"

check_var "SUPABASE_SERVICE_ROLE_KEY" \
  "Clé service_role Supabase (pour les uploads côté serveur)" \
  "Supabase Dashboard → Settings → API → service_role (secret)"

echo -e "${BOLD}── Authentification Google ──${RESET}"
check_var "GOOGLE_CLIENT_ID" \
  "Client ID OAuth 2.0 Google" \
  "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID"

check_var "GOOGLE_CLIENT_SECRET" \
  "Client Secret OAuth 2.0 Google" \
  "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID"

echo -e "${BOLD}── Sessions ──${RESET}"
check_var "SESSION_SECRET" \
  "Chaîne aléatoire secrète pour signer les cookies de session" \
  "Générez avec : openssl rand -hex 32"

echo ""
echo -e "${BOLD}══════════════════════════════════════════${RESET}"

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}  ✗ $MISSING variable(s) manquante(s)${RESET}"
  echo ""
  echo -e "  ${BOLD}Comment les ajouter dans Replit :${RESET}"
  echo -e "  1. Ouvrez l'onglet ${BOLD}Secrets${RESET} (🔒) dans le panneau gauche"
  echo -e "  2. Ajoutez chaque variable manquante ci-dessus"
  echo -e "  3. Relancez le projet"
  echo ""
  echo -e "  ${YELLOW}⚠ Les variables non-secrètes (EXPO_PUBLIC_*) peuvent aussi"
  echo -e "    être ajoutées dans l'onglet Secrets.${RESET}"
  echo ""
  echo -e "${BOLD}══════════════════════════════════════════${RESET}"
  echo ""
  exit 1
else
  echo ""
  echo -e "${GREEN}${BOLD}  ✓ Toutes les variables sont configurées !${RESET}"
  echo ""
  echo -e "${BOLD}══════════════════════════════════════════${RESET}"
  echo ""
  exit 0
fi
