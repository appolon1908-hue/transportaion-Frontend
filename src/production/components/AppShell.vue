<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../auth/store";
import type { PortalKind } from "../types";

interface NavigationItem {
  label: string;
  to: string;
  code: string;
  portal?: PortalKind;
  permission?: string;
  capability?: string;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const mobileOpen = ref(false);
const switchingOrganization = ref(false);

const navigation: NavigationItem[] = [
  { label: "Control tower", to: "/", code: "CT" },
  {
    label: "Administration",
    to: "/portal/admin",
    code: "AD",
    portal: "ADMIN",
    permission: "admin.users.manage",
  },
  {
    label: "Operations",
    to: "/portal/operations",
    code: "OP",
    portal: "OPERATIONS",
    permission: "operations.read",
  },
  {
    label: "Customer portal",
    to: "/portal/customer",
    code: "CU",
    portal: "CUSTOMER",
    capability: "customer_portal.external_access",
  },
  {
    label: "Carrier portal",
    to: "/portal/carrier",
    code: "CA",
    portal: "CARRIER",
    capability: "carrier_portal.external_access",
  },
];

const visibleNavigation = computed(() =>
  navigation.filter((item) => {
    if (item.portal && !auth.hasPortal(item.portal)) return false;
    if (item.permission && !auth.hasPermission(item.permission)) return false;
    if (item.capability && !auth.hasCapability(item.capability)) return false;
    return true;
  }),
);

const pageTitle = computed(() =>
  typeof route.meta.title === "string" ? route.meta.title : "Freight platform",
);

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);

const changeOrganization = async (event: Event): Promise<void> => {
  const organizationId = (event.target as HTMLSelectElement).value;
  if (!organizationId || organizationId === auth.selectedOrganizationId) return;
  switchingOrganization.value = true;
  try {
    await auth.selectOrganization(organizationId);
    await router.push("/");
  } finally {
    switchingOrganization.value = false;
  }
};
</script>

<template>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div class="app-frame">
    <aside class="sidebar" :class="{ open: mobileOpen }" aria-label="Primary navigation">
      <div class="sidebar-brand">
        <span class="brand-mark brand-mark-small" aria-hidden="true">F</span>
        <div>
          <strong>Freight</strong>
          <small>Control Tower</small>
        </div>
      </div>

      <nav class="nav-list">
        <RouterLink
          v-for="item in visibleNavigation"
          :key="item.to"
          :to="item.to"
          class="nav-item"
        >
          <span class="nav-code" aria-hidden="true">{{ item.code }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-governance">
        <span class="status-dot" aria-hidden="true" />
        <div>
          <strong>Backend-authorized</strong>
          <small>Tenant and permissions rechecked per request</small>
        </div>
      </div>
    </aside>

    <div class="app-content">
      <header class="topbar">
        <div class="topbar-left">
          <button
            type="button"
            class="icon-button mobile-menu"
            :aria-expanded="mobileOpen"
            aria-label="Toggle navigation"
            @click="mobileOpen = !mobileOpen"
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <small>{{ auth.organizationName }}</small>
            <strong>{{ pageTitle }}</strong>
          </div>
        </div>

        <div class="topbar-actions">
          <label v-if="auth.memberships.length > 1" class="organization-switcher">
            <span class="sr-only">Organization</span>
            <select
              :value="auth.selectedOrganizationId ?? ''"
              :disabled="switchingOrganization"
              @change="changeOrganization"
            >
              <option disabled value="">Select organization</option>
              <option
                v-for="membership in auth.memberships"
                :key="membership.organizationId"
                :value="membership.organizationId"
              >
                {{ membership.organizationName }}
              </option>
            </select>
          </label>

          <div class="user-summary">
            <span class="avatar" aria-hidden="true">
              {{ auth.user?.displayName?.slice(0, 1).toUpperCase() || "U" }}
            </span>
            <div>
              <strong>{{ auth.user?.displayName }}</strong>
              <small>{{ auth.user?.email }}</small>
            </div>
          </div>
          <button type="button" class="button button-quiet" @click="auth.logout()">
            Sign out
          </button>
        </div>
      </header>

      <main id="main-content" class="main-content" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
