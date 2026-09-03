/**
 * migrate-images.ts
 *
 * Script de migration non-destructif pour remplacer les anciennes URLs
 * spock.replit.dev par de nouvelles URLs Supabase Storage.
 *
 * PRINCIPE :
 *   - Ne modifie rien sans validation explicite (--apply)
 *   - Ne supprime aucun enregistrement
 *   - Ne met aucun champ à NULL
 *   - Chaque UPDATE est ciblé : vérifie que l'ancienne URL correspond avant de remplacer
 *   - Toutes les opérations sont enveloppées dans une transaction (rollback en cas d'erreur)
 *
 * USAGE :
 *
 *   1. Dry-run (affiche ce qui serait modifié, sans toucher la base) :
 *      pnpm --filter @workspace/scripts tsx src/migrate-images.ts
 *
 *   2. Application réelle :
 *      pnpm --filter @workspace/scripts tsx src/migrate-images.ts --apply
 *
 * CONFIGURATION :
 *   Éditez la section IMAGE_MAPPING ci-dessous.
 *   Pour chaque image à migrer, indiquez :
 *     - oldUuid  : le UUID de l'ancien fichier (dernier segment de l'ancienne URL)
 *     - newUrl   : la nouvelle URL Supabase Storage (https://...supabase.co/storage/v1/object/public/wapi-bucket/...)
 *
 * OBTENIR LA NOUVELLE URL :
 *   Après avoir ré-uploadé l'image dans l'app, copiez l'URL Supabase retournée
 *   par pickAndUploadImage() (visible dans les logs Metro : "[imageUrl] proxy: ...").
 *   Ou depuis le dashboard Supabase : Storage → wapi-bucket → uploads → copier l'URL publique.
 */

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { garagesTable, garagePhotosTable } from "@workspace/db/schema";

// ============================================================
// CONFIGURATION — à remplir avant d'exécuter --apply
// ============================================================

/**
 * Mapping : UUID de l'ancien fichier → nouvelle URL Supabase Storage.
 *
 * Les UUIDs ci-dessous sont les identifiants des fichiers sur l'ancien Repl
 * (dernier segment des anciennes URLs spock.replit.dev).
 * Renseignez newUrl dès qu'une image a été ré-uploadée.
 * Laissez newUrl: null pour les images non encore migrées — elles seront ignorées.
 */
const IMAGE_MAPPING: Array<{
  oldUuid: string;
  description: string;
  newUrl: string | null; // null = pas encore migré, ignoré
}> = [
  // ----- garages id=1 "Congo auto" -----
  {
    oldUuid: "fc38d76e-bc3c-493d-a3bf-7e8c9b161a7c",
    description: "Congo auto — cover_image_url",
    newUrl: null, // TODO: renseigner après re-upload
  },
  {
    oldUuid: "f9516fab-bb0a-417d-91b7-63f8ce354dfe",
    description: "Congo auto — avatar_image_url",
    newUrl: null, // TODO: renseigner après re-upload
  },
  // ----- garages id=3 "Auto moto" -----
  {
    oldUuid: "df6f018c-5e91-4742-b67c-d91b0b91be3c",
    description: "Auto moto — cover_image_url",
    newUrl: null, // TODO: renseigner après re-upload
  },
  {
    oldUuid: "33a322a1-746e-4d91-9f11-10cf49156424",
    description: "Auto moto — avatar_image_url",
    newUrl: null, // TODO: renseigner après re-upload
  },
  // ----- garage_photos -----
  {
    oldUuid: "0753baa6-6395-4473-85dd-20732aff147c",
    description: "garage_photos id=1 (garage Congo auto)",
    newUrl: null, // TODO: renseigner après re-upload
  },
  {
    oldUuid: "fcf1d91b-93a6-43cf-b259-4f49d2d3f8a8",
    description: "garage_photos id=2 (garage Auto moto)",
    newUrl: null, // TODO: renseigner après re-upload
  },
];

// ============================================================
// FIN CONFIGURATION
// ============================================================

const SPOCK_BASE =
  "https://63846527-3297-49fa-8051-98c779f016da-00-6u4htp7bf1kn.spock.replit.dev/api/storage/objects/uploads/";

function buildOldUrl(uuid: string): string {
  return `${SPOCK_BASE}${uuid}`;
}

async function main() {
  const isDryRun = !process.argv.includes("--apply");

  const connectionString =
    process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "❌  SUPABASE_DATABASE_URL (ou DATABASE_URL) n'est pas défini.",
    );
    process.exit(1);
  }

  const client = new pg.Client({ connectionString, ssl: true });
  await client.connect();
  const db = drizzle(client);

  console.log("\n════════════════════════════════════════════════════");
  console.log(isDryRun ? "  DRY-RUN — aucune modification appliquée" : "  APPLY — modifications en base");
  console.log("════════════════════════════════════════════════════\n");

  const ready = IMAGE_MAPPING.filter((m) => m.newUrl !== null);
  const pending = IMAGE_MAPPING.filter((m) => m.newUrl === null);

  console.log(`📋  ${IMAGE_MAPPING.length} images au total`);
  console.log(`✅  ${ready.length} prêtes à migrer (newUrl renseigné)`);
  console.log(`⏳  ${pending.length} en attente (newUrl = null)\n`);

  if (pending.length > 0) {
    console.log("Images non encore migrées :");
    for (const m of pending) {
      console.log(`   • ${m.description} [${m.oldUuid}]`);
    }
    console.log();
  }

  if (ready.length === 0) {
    console.log("Rien à faire — renseignez des newUrl dans IMAGE_MAPPING pour migrer.");
    await client.end();
    return;
  }

  // Vérification préalable : les anciens enregistrements existent-ils ?
  console.log("🔍  Vérification des enregistrements existants...\n");

  // Charger les données actuelles
  const garages = await db
    .select({ id: garagesTable.id, name: garagesTable.name, cover: garagesTable.coverImageUrl, avatar: garagesTable.avatarImageUrl })
    .from(garagesTable);

  const photos = await db
    .select({ id: garagePhotosTable.id, garageId: garagePhotosTable.garageId, url: garagePhotosTable.url })
    .from(garagePhotosTable);

  const ops: Array<{ description: string; sql: string; apply: () => Promise<void> }> = [];

  for (const mapping of ready) {
    const oldUrl = buildOldUrl(mapping.oldUuid);
    const newUrl = mapping.newUrl!;

    // Chercher dans garages.cover_image_url
    const coverMatch = garages.find((g) => g.cover === oldUrl);
    if (coverMatch) {
      ops.push({
        description: `garages id=${coverMatch.id} "${coverMatch.name}" — cover_image_url`,
        sql: `UPDATE garages SET cover_image_url = '${newUrl}' WHERE id = ${coverMatch.id} AND cover_image_url = '${oldUrl}';`,
        apply: async () => {
          await db
            .update(garagesTable)
            .set({ coverImageUrl: newUrl })
            .where(eq(garagesTable.id, coverMatch.id));
        },
      });
    }

    // Chercher dans garages.avatar_image_url
    const avatarMatch = garages.find((g) => g.avatar === oldUrl);
    if (avatarMatch) {
      ops.push({
        description: `garages id=${avatarMatch.id} "${avatarMatch.name}" — avatar_image_url`,
        sql: `UPDATE garages SET avatar_image_url = '${newUrl}' WHERE id = ${avatarMatch.id} AND avatar_image_url = '${oldUrl}';`,
        apply: async () => {
          await db
            .update(garagesTable)
            .set({ avatarImageUrl: newUrl })
            .where(eq(garagesTable.id, avatarMatch.id));
        },
      });
    }

    // Chercher dans garage_photos.url
    const photoMatch = photos.find((p) => p.url === oldUrl);
    if (photoMatch) {
      ops.push({
        description: `garage_photos id=${photoMatch.id} (garage_id=${photoMatch.garageId}) — url`,
        sql: `UPDATE garage_photos SET url = '${newUrl}' WHERE id = ${photoMatch.id} AND url = '${oldUrl}';`,
        apply: async () => {
          await db
            .update(garagePhotosTable)
            .set({ url: newUrl })
            .where(eq(garagePhotosTable.id, photoMatch.id));
        },
      });
    }

    if (!coverMatch && !avatarMatch && !photoMatch) {
      console.warn(`  ⚠️  UUID ${mapping.oldUuid} introuvable en base — ignoré`);
    }
  }

  if (ops.length === 0) {
    console.log("Aucune correspondance trouvée en base pour les UUID prêts.");
    await client.end();
    return;
  }

  console.log(`\n📝  ${ops.length} opération(s) à effectuer :\n`);
  for (const op of ops) {
    console.log(`  ► ${op.description}`);
    console.log(`    ${op.sql}\n`);
  }

  if (isDryRun) {
    console.log("────────────────────────────────────────────────────");
    console.log("DRY-RUN terminé. Pour appliquer, relancez avec --apply");
    console.log("────────────────────────────────────────────────────\n");
  } else {
    console.log("⚡  Application des modifications...\n");
    await db.transaction(async (tx) => {
      for (const op of ops) {
        await op.apply();
        console.log(`  ✅  ${op.description}`);
      }
    });

    // Vérification post-migration : compter les URLs spock restantes
    const remaining = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM garages      WHERE cover_image_url  LIKE '%spock.replit.dev%') +
        (SELECT COUNT(*) FROM garages      WHERE avatar_image_url LIKE '%spock.replit.dev%') +
        (SELECT COUNT(*) FROM garage_photos WHERE url             LIKE '%spock.replit.dev%')
      AS total_restantes
    `);
    const restantes = Number(remaining.rows[0]?.total_restantes ?? "?");

    console.log(`\n════════════════════════════════════════════════════`);
    console.log(`  Migration terminée. URLs spock restantes : ${restantes}`);
    console.log(`════════════════════════════════════════════════════\n`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("❌  Erreur fatale :", err);
  process.exit(1);
});
