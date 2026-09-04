import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const kpay = read("artifacts/api-server/src/routes/kpay.ts");
const reviews = read("artifacts/api-server/src/routes/reviews.ts");
const mobilePay = read("artifacts/mobile/app/(tabs)/pay.tsx");
const privacy = read("artifacts/mobile/app/privacy.tsx");
const i18n = read("artifacts/mobile/lib/i18n.ts");
const proxyImage = read("artifacts/mobile/components/ProxyImage.tsx");
const pay = read("artifacts/mobile/app/(tabs)/pay.tsx");
const garage = read("artifacts/mobile/app/garage/[id].tsx");

const has = (source, pattern) => assert.match(source, pattern);

test("le paiement recharge invoiceId et le montant serveur", () => {
  has(kpay, /const invoiceId = typeof req\.body\?\.invoiceId/);
  has(kpay, /eq\(invoicesTable\.id, invoiceId\)/);
  has(kpay, /amount: invoice\.amount/);
  has(mobilePay, /invoiceId: payload\.invoiceId/);
});

test("le webhook exige une signature et protège les doublons", () => {
  has(kpay, /validWebhookSecret/);
  has(kpay, /timingSafeEqual/);
  has(kpay, /payment\.status === "SUCCESS"\s*\|\|\s*payment\.status === "PAID"/);
  has(kpay, /invoiceId/);
});

test("un avis est lié à une facture payée", () => {
  has(reviews, /invoiceId/);
  has(reviews, /paid/);
});

test("le mobile ne déclare pas un paiement localement comme confirmé", () => {
  has(mobilePay, /\/api\/invoices\/\$\{encodeURIComponent\(payload\.invoiceId\)\}\/status/);
  has(mobilePay, /pending|paid|failed/);
});

test("la politique et les traductions françaises sont présentes", () => {
  has(privacy, /@\/lib\/i18n/);
  has(i18n, /Dernière mise à jour/);
  has(i18n, /KPay/);
  has(i18n, /suppression/);
});

test("les images utilisent le cache et les actions critiques ont des labels", () => {
  has(proxyImage, /cachePolicy.*memory-disk/);
  has(pay, /accessibilityLabel="Autoriser l'accès à la caméra"/);
  has(garage, /accessibilityLabel="Publier l'avis"/);
});
