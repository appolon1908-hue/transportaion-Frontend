import { expect, test, type Page } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";
const issuer = "https://auth.codestra.co/realms/codestra";
const clientId = "freight-platform-web";

const base64Url = (value: object): string =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");

const idToken = (nonce: string): string =>
  [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      iss: issuer,
      aud: clientId,
      azp: clientId,
      nonce,
      exp: Math.floor(Date.now() / 1000) + 900,
      sub: "e2e-user",
    }),
    "e2e-signature",
  ].join(".");

interface AccessProfile {
  role: "CUSTOMER" | "CARRIER";
  permission: "portal.customer" | "portal.carrier";
  capability:
    | "customer_portal.external_access"
    | "carrier_portal.external_access";
}

const installIdentityMocks = async (
  page: Page,
  profile: AccessProfile,
): Promise<void> => {
  let expectedNonce = "";

  await page.route(`${issuer}/.well-known/openid-configuration`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
        token_endpoint: `${issuer}/protocol/openid-connect/token`,
        end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
      }),
    });
  });

  await page.route(`${issuer}/protocol/openid-connect/auth**`, async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get("state");
    expectedNonce = url.searchParams.get("nonce") ?? "";
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("client_id")).toBe(clientId);
    expect(state).toBeTruthy();
    expect(expectedNonce).toBeTruthy();
    await route.fulfill({
      status: 302,
      headers: {
        location: `${baseURL}/auth/callback?code=e2e-code&state=${encodeURIComponent(state ?? "")}`,
      },
    });
  });

  await page.route(`${issuer}/protocol/openid-connect/token`, async (route) => {
    const body = route.request().postData() ?? "";
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code_verifier=");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "e2e-access-token",
        refresh_token: "e2e-refresh-token",
        id_token: idToken(expectedNonce),
        token_type: "Bearer",
        expires_in: 900,
        scope: "openid profile email offline_access",
      }),
    });
  });

  await page.route("**/api/v1/auth/me", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer e2e-access-token");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-1",
          subject: "e2e-user",
          email: "operator@example.test",
          display_name: "E2E Operator",
        },
        memberships: [
          {
            organization_id: "org-1",
            organization_name: "Freight E2E",
            roles: [profile.role],
            permissions: [profile.permission],
            capabilities: [profile.capability],
            status: "ACTIVE",
          },
        ],
        roles: [profile.role],
        permissions: [profile.permission],
        capabilities: [profile.capability],
      }),
    });
  });
};

const signInTo = async (page: Page, portal: "customer" | "carrier"): Promise<void> => {
  await page.goto(`/portal/${portal}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?returnTo=.*portal.*${portal}`));
  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await expect(page).toHaveURL(`${baseURL}/portal/${portal}`);
};

test("customer completes PKCE sign-in and accepts a quote with command headers", async ({
  page,
}) => {
  await installIdentityMocks(page, {
    role: "CUSTOMER",
    permission: "portal.customer",
    capability: "customer_portal.external_access",
  });

  let decisionHeaders: Record<string, string> = {};
  await page.route("**/api/v1/portals/customer/context", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        portal: "CUSTOMER",
        binding: {
          id: "binding-customer",
          display_label: "Acme Manufacturing",
          status: "ACTIVE",
          version: 1,
        },
        customer: { id: "customer-1", name: "Acme Manufacturing" },
      }),
    }),
  );
  await page.route("**/api/v1/portals/customer/quotes/q-1/decision", async (route) => {
    decisionHeaders = route.request().headers();
    const body = route.request().postDataJSON() as { decision: string };
    expect(body.decision).toBe("ACCEPT");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "q-1",
        version: 3,
        customer_id: "customer-1",
        status: "ACCEPTED",
        currency: "USD",
        sell_total_minor: 125000,
      }),
    });
  });
  await page.route("**/api/v1/portals/customer/quotes", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "q-1",
            version: 2,
            customer_id: "customer-1",
            status: "SENT",
            currency: "USD",
            sell_total_minor: 125000,
          },
        ],
        next_cursor: null,
      }),
    }),
  );
  await page.route("**/api/v1/portals/customer/shipments", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "shipment-1",
            version: 1,
            customer_id: "customer-1",
            customer_reference: "PO-4401",
            mode: "FTL",
            status: "IN_TRANSIT",
          },
        ],
        next_cursor: null,
      }),
    }),
  );
  await page.route("**/api/v1/portals/customer/invoices", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );
  await page.route("**/api/v1/portals/customer/claims", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );

  await signInTo(page, "customer");
  await expect(page.getByRole("heading", { name: "Acme Manufacturing" })).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText(/Quote accepted/)).toBeVisible();
  expect(decisionHeaders["idempotency-key"]).toBeTruthy();
  expect(decisionHeaders["if-match"]).toBe("2");
  expect(decisionHeaders.authorization).toBe("Bearer e2e-access-token");
});

test("carrier submits deduplicated tracking with a stable source event ID", async ({
  page,
}) => {
  await installIdentityMocks(page, {
    role: "CARRIER",
    permission: "portal.carrier",
    capability: "carrier_portal.external_access",
  });

  let trackingHeaders: Record<string, string> = {};
  await page.route("**/api/v1/portals/carrier/context", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        portal: "CARRIER",
        binding: {
          id: "binding-carrier",
          display_label: "Roadstar Logistics",
          status: "ACTIVE",
          version: 1,
        },
        carrier: { id: "carrier-1", legal_name: "Roadstar Logistics" },
      }),
    }),
  );
  await page.route("**/api/v1/portals/carrier/tenders", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );
  await page.route("**/api/v1/portals/carrier/loads/load-1/tracking", async (route) => {
    trackingHeaders = route.request().headers();
    const body = route.request().postDataJSON() as { source_event_id: string };
    expect(body.source_event_id).toBe("device-event-1001");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ duplicate: false, submission: { id: "tracking-1" } }),
    });
  });
  await page.route("**/api/v1/portals/carrier/loads", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "load-1",
            version: 1,
            load_number: "LD-1001",
            equipment_type: "DRY_VAN",
            status: "IN_TRANSIT",
            carrier_id: "carrier-1",
            currency: "USD",
          },
        ],
        next_cursor: null,
      }),
    }),
  );
  await page.route("**/api/v1/portals/carrier/evidence", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );
  await page.route("**/api/v1/portals/carrier/settlements", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );

  await signInTo(page, "carrier");
  await expect(page.getByRole("heading", { name: "Roadstar Logistics" })).toBeVisible();
  await page.getByLabel("Unique source event ID").fill("device-event-1001");
  await page.getByRole("button", { name: "Submit tracking" }).click();
  await expect(page.getByText(/Tracking event accepted/)).toBeVisible();
  expect(trackingHeaders["idempotency-key"]).toBe("device-event-1001");
  expect(trackingHeaders.authorization).toBe("Bearer e2e-access-token");
});
