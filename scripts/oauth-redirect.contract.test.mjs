import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "development";
process.env.REPLIT_EXPO_DEV_DOMAIN = "expo.archer.replit.dev";
process.env.REPLIT_DEV_DOMAIN = "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev";
delete process.env.MOBILE_AUTH_REDIRECT_ALLOWLIST;
delete process.env.MOBILE_AUTH_REDIRECT_ALLOWLIST_DEVELOPMENT;

const { getSafeMobileRedirect, getDefaultMobileRedirect } = await import(
  "../artifacts/api-server/src/lib/oauthRedirect.ts"
);

test("autorise le sous-domaine Expo généré par Replit", () => {
  const redirect = "exp://6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.expo.archer.replit.dev/--/auth";
  assert.equal(getSafeMobileRedirect(redirect), redirect);
});

test("conserve la redirection par défaut basée sur le domaine Expo", () => {
  assert.equal(getDefaultMobileRedirect(), "exp://expo.archer.replit.dev/--/auth");
});

test("reconstruit le domaine Expo depuis le domaine public Replit", async () => {
  delete process.env.REPLIT_EXPO_DEV_DOMAIN;
  const redirectModule = await import(`../artifacts/api-server/src/lib/oauthRedirect.ts?fallback=${Date.now()}`);
  assert.equal(
    redirectModule.getDefaultMobileRedirect(),
    "exp://6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.expo.archer.replit.dev/--/auth",
  );
});

test("refuse un domaine ou un chemin Expo non autorisé", () => {
  assert.equal(getSafeMobileRedirect("exp://evil.example/--/auth"), null);
  assert.equal(getSafeMobileRedirect("exp://expo.archer.replit.dev/other"), null);
});
