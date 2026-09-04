import { createRouter, createWebHistory } from "vue-router";
import type { PortalKind } from "./types";
import { useAuthStore } from "./auth/store";
import AdminPortalView from "./views/AdminPortalView.vue";
import CarrierPortalView from "./views/CarrierPortalView.vue";
import CustomerPortalView from "./views/CustomerPortalView.vue";
import DashboardView from "./views/DashboardView.vue";
import LoginView from "./views/LoginView.vue";
import MessageView from "./views/MessageView.vue";
import OidcCallbackView from "./views/OidcCallbackView.vue";
import OperationsPortalView from "./views/OperationsPortalView.vue";
import SelectOrganizationView from "./views/SelectOrganizationView.vue";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    public?: boolean;
    guestOnly?: boolean;
    organizationOptional?: boolean;
    requiredPermissions?: string[];
    requiredCapability?: string;
    portal?: PortalKind;
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { title: "Sign in", public: true, guestOnly: true },
    },
    {
      path: "/auth/callback",
      name: "oidc-callback",
      component: OidcCallbackView,
      meta: { title: "Completing sign in", public: true },
    },
    {
      path: "/select-organization",
      name: "select-organization",
      component: SelectOrganizationView,
      meta: { title: "Select organization", organizationOptional: true },
    },
    {
      path: "/",
      name: "dashboard",
      component: DashboardView,
      meta: { title: "Control tower" },
    },
    {
      path: "/portal/admin",
      name: "admin-portal",
      component: AdminPortalView,
      meta: {
        title: "Administration",
        portal: "ADMIN",
        requiredPermissions: ["admin.identity.read"],
      },
    },
    {
      path: "/portal/operations",
      name: "operations-portal",
      component: OperationsPortalView,
      meta: {
        title: "Transportation operations",
        portal: "OPERATIONS",
        requiredPermissions: ["operations.read"],
      },
    },
    {
      path: "/portal/customer",
      name: "customer-portal",
      component: CustomerPortalView,
      meta: {
        title: "Customer portal",
        portal: "CUSTOMER",
        requiredPermissions: ["portal.customer"],
        requiredCapability: "customer_portal.external_access",
      },
    },
    {
      path: "/portal/carrier",
      name: "carrier-portal",
      component: CarrierPortalView,
      meta: {
        title: "Carrier portal",
        portal: "CARRIER",
        requiredPermissions: ["portal.carrier"],
        requiredCapability: "carrier_portal.external_access",
      },
    },
    {
      path: "/forbidden",
      name: "forbidden",
      component: MessageView,
      props: {
        eyebrow: "Access stopped",
        title: "This workspace is not available.",
        message:
          "Your verified organization context does not include the required permission or rollout capability.",
      },
      meta: { title: "Access denied", organizationOptional: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: MessageView,
      props: {
        eyebrow: "Page not found",
        title: "This route does not exist.",
        message:
          "The address may be outdated or the feature may not be part of your current portal.",
      },
      meta: { title: "Not found", organizationOptional: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.initialize();

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: "dashboard" };
  }
  if (to.meta.public) return true;
  if (!auth.isAuthenticated) {
    return {
      name: "login",
      query: { returnTo: to.fullPath },
    };
  }
  if (!auth.context) {
    try {
      await auth.fetchContext();
    } catch {
      auth.clearSession();
      return {
        name: "login",
        query: { returnTo: to.fullPath },
      };
    }
  }
  if (
    !to.meta.organizationOptional &&
    auth.memberships.length > 1 &&
    !auth.selectedOrganizationId
  ) {
    return {
      name: "select-organization",
      query: { returnTo: to.fullPath },
    };
  }
  if (!to.meta.organizationOptional && auth.memberships.length === 0) {
    return { name: "forbidden" };
  }
  if (
    to.meta.requiredPermissions &&
    !auth.hasEveryPermission(to.meta.requiredPermissions)
  ) {
    return { name: "forbidden" };
  }
  if (
    to.meta.requiredCapability &&
    !auth.hasCapability(to.meta.requiredCapability)
  ) {
    return { name: "forbidden" };
  }
  if (to.meta.portal && !auth.hasPortal(to.meta.portal)) {
    return { name: "forbidden" };
  }
  return true;
});

router.afterEach((to) => {
  document.title = `${to.meta.title ?? "Freight"} · Freight Control Tower`;
});

export default router;
