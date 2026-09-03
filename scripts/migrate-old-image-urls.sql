-- ============================================================
-- Audit + Migration non-destructive : URLs spock.replit.dev
-- ============================================================
-- Ce script NE SUPPRIME RIEN et ne met AUCUN CHAMP à NULL.
--
-- Deux modes d'utilisation :
--
--   MODE AUDIT (défaut) :
--     Exécutez jusqu'à la section AUDIT — retourne les 6 enregistrements
--     concernés sans rien modifier.
--
--   MODE MIGRATION :
--     Renseignez les nouvelles URLs dans la section MAPPING, puis
--     exécutez le bloc UPDATE dans une transaction.
--     La transaction se termine en ROLLBACK par défaut — remplacez-le
--     par COMMIT après avoir vérifié le résultat des SELECT de vérification.
--
-- Préférez le script TypeScript (scripts/src/migrate-images.ts) pour
-- une migration interactive avec validation automatique.
-- ============================================================


-- ============================================================
-- SECTION 1 — AUDIT (toujours sûr à exécuter)
-- ============================================================

-- 1a. Inventaire complet des 6 enregistrements concernés
SELECT
  'garages'            AS "table",
  id                   AS "id",
  name                 AS "garage",
  'cover_image_url'    AS "champ",
  cover_image_url      AS "ancienne_url"
FROM garages
WHERE cover_image_url LIKE '%spock.replit.dev%'

UNION ALL

SELECT
  'garages',
  id,
  name,
  'avatar_image_url',
  avatar_image_url
FROM garages
WHERE avatar_image_url LIKE '%spock.replit.dev%'

UNION ALL

SELECT
  'garage_photos',
  gp.id,
  g.name,
  'url',
  gp.url
FROM garage_photos gp
JOIN garages g ON g.id = gp.garage_id
WHERE gp.url LIKE '%spock.replit.dev%'

ORDER BY "table", "id";


-- 1b. Compteur rapide
SELECT
  'garages.cover_image_url'   AS champ, COUNT(*) AS total
  FROM garages       WHERE cover_image_url  LIKE '%spock.replit.dev%'
UNION ALL
SELECT 'garages.avatar_image_url',   COUNT(*)
  FROM garages       WHERE avatar_image_url LIKE '%spock.replit.dev%'
UNION ALL
SELECT 'garage_photos.url',           COUNT(*)
  FROM garage_photos WHERE url             LIKE '%spock.replit.dev%';


-- ============================================================
-- SECTION 2 — MIGRATION (exécuter uniquement après re-upload)
-- ============================================================
-- Remplacez chaque <NOUVELLE_URL_SUPABASE_...> par l'URL publique Supabase
-- obtenue après avoir ré-uploadé l'image dans l'application.
-- Format attendu :
--   https://rljiaxrwhaffgdvygdvy.supabase.co/storage/v1/object/public/wapi-bucket/uploads/<nouveau-fichier>
--
-- Laissez le bloc commenté tant que l'image n'a pas été ré-uploadée.
-- ============================================================

BEGIN;

-- ── garages id=1 "Congo auto" ──────────────────────────────

-- cover_image_url (UUID ancien : fc38d76e-bc3c-493d-a3bf-7e8c9b161a7c)
-- UPDATE garages
-- SET cover_image_url = '<NOUVELLE_URL_SUPABASE_cover_congo_auto>'
-- WHERE id = 1
--   AND cover_image_url LIKE '%fc38d76e-bc3c-493d-a3bf-7e8c9b161a7c%';

-- avatar_image_url (UUID ancien : f9516fab-bb0a-417d-91b7-63f8ce354dfe)
-- UPDATE garages
-- SET avatar_image_url = '<NOUVELLE_URL_SUPABASE_avatar_congo_auto>'
-- WHERE id = 1
--   AND avatar_image_url LIKE '%f9516fab-bb0a-417d-91b7-63f8ce354dfe%';


-- ── garages id=3 "Auto moto" ───────────────────────────────

-- cover_image_url (UUID ancien : df6f018c-5e91-4742-b67c-d91b0b91be3c)
-- UPDATE garages
-- SET cover_image_url = '<NOUVELLE_URL_SUPABASE_cover_auto_moto>'
-- WHERE id = 3
--   AND cover_image_url LIKE '%df6f018c-5e91-4742-b67c-d91b0b91be3c%';

-- avatar_image_url (UUID ancien : 33a322a1-746e-4d91-9f11-10cf49156424)
-- UPDATE garages
-- SET avatar_image_url = '<NOUVELLE_URL_SUPABASE_avatar_auto_moto>'
-- WHERE id = 3
--   AND avatar_image_url LIKE '%33a322a1-746e-4d91-9f11-10cf49156424%';


-- ── garage_photos ──────────────────────────────────────────

-- id=1 garage_id=1 "Congo auto" (UUID ancien : 0753baa6-6395-4473-85dd-20732aff147c)
-- UPDATE garage_photos
-- SET url = '<NOUVELLE_URL_SUPABASE_photo1_congo_auto>'
-- WHERE id = 1
--   AND url LIKE '%0753baa6-6395-4473-85dd-20732aff147c%';

-- id=2 garage_id=3 "Auto moto" (UUID ancien : fcf1d91b-93a6-43cf-b259-4f49d2d3f8a8)
-- UPDATE garage_photos
-- SET url = '<NOUVELLE_URL_SUPABASE_photo2_auto_moto>'
-- WHERE id = 2
--   AND url LIKE '%fcf1d91b-93a6-43cf-b259-4f49d2d3f8a8%';


-- Vérification post-migration (décommenter les UPDATE avant de vérifier)
SELECT
  'garages.cover'   AS champ, COUNT(*) AS spock_restants FROM garages      WHERE cover_image_url  LIKE '%spock.replit.dev%'
UNION ALL SELECT 'garages.avatar',  COUNT(*) FROM garages      WHERE avatar_image_url LIKE '%spock.replit.dev%'
UNION ALL SELECT 'garage_photos',   COUNT(*) FROM garage_photos WHERE url             LIKE '%spock.replit.dev%';

-- ⚠️  ROLLBACK par défaut — remplacez par COMMIT après validation
ROLLBACK;
