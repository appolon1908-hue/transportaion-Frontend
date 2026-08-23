<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">FP</span>
        <div><strong>Freight Platform</strong><small>Operations</small></div>
      </div>
      <nav aria-label="Primary navigation">
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <RouterLink to="/customers">Customers</RouterLink>
        <RouterLink to="/carriers">Carriers</RouterLink>
        <RouterLink to="/quotes">Quotes</RouterLink>
        <RouterLink to="/shipments">Shipments</RouterLink>
        <RouterLink to="/loads">Loads</RouterLink>
        <RouterLink to="/tracking">Tracking</RouterLink>
        <RouterLink to="/invoices">Invoices</RouterLink>
        <RouterLink to="/settlements">Settlements</RouterLink>
        <RouterLink to="/claims">Claims</RouterLink>
        <RouterLink to="/operations/exceptions">Exceptions</RouterLink>
        <RouterLink to="/admin/capabilities">Capabilities</RouterLink>
      </nav>
    </aside>
    <div class="content"><RouterView /></div>
  </div>
</template>
