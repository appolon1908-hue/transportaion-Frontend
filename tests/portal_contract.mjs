import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const router = read("src/production/router.ts");
const portalApi = read("src/production/api/portals.ts");
const client = read("src/production/api/client.ts");
const oidc = read("src/production/auth/oidc.ts");
const packageJson = JSON.parse(read("package.json"));

const requiredViews = [
  "AdminPortalView",
  "OperationsPortalView",
  "CustomerPortalView",
  "CarrierPortalView",
];
for (const view of requiredViews) {
  assert.match(router, new RegExp(`import ${view} from`), `${view} must be routed`);
  assert.match(router, new RegExp(`component: ${view}`), `${view} must be a route component`);
  const source = read(`src/production/views/${view}.vue`);
  assert.ok(source.includes("portalApi."), `${view} must use the typed portal API`);
  assert.ok(!source.includes("v-html"), `${view} must not render untrusted HTML`);
}
assert.ok(
  !router.includes("component: PortalLandingView"),
  "role-specific routes must not use the placeholder portal view",
);

const requiredPaths = [
  "/admin/portal-bindings",
  "/admin/portal-reviews/claims",
  "/admin/portal-reviews/carrier-evidence",
  "/operations/control-tower",
  "/operations/work-queue",
  "/portals/customer/context",
  "/portals/customer/quotes",
  "/portals/customer/shipments",
  "/portals/customer/invoices",
  "/portals/customer/claims",
  "/portals/carrier/context",
  "/portals/carrier/tenders",
  "/portals/carrier/loads",
  "/portals/carrier/evidence",
  "/portals/carrier/settlements",
];
for (const path of requiredPaths) {
  assert.ok(portalApi.includes(path), `typed API is missing ${path}`);
}

assert.ok(client.includes('headers.set("Idempotency-Key"'), "mutations require idempotency support");
assert.ok(client.includes('headers.set("If-Match"'), "mutations require optimistic concurrency support");
assert.ok(client.includes('credentials: "omit"'), "bearer requests must not send ambient cookies");
assert.ok(oidc.includes('code_challenge_method: "S256"'), "OIDC must use PKCE S256");
assert.ok(!client.includes("localStorage"), "tokens and API state must not use localStorage");
assert.ok(!oidc.includes("client_secret"), "the browser client must remain public");

assert.equal(packageJson.scripts["test:portal"], "node tests/portal_contract.mjs");
assert.equal(packageJson.scripts.e2e, "playwright test");

console.log({
  workspaces: requiredViews.length,
  typedPaths: requiredPaths.length,
  securityContracts: 7,
});
