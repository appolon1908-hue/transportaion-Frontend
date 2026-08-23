<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { api } from '../shared/api/client'

const capabilities = useQuery({
  queryKey: ['capabilities'],
  queryFn: () => api<{ capabilities: Record<string, boolean> }>('/api/v1/capabilities'),
})
</script>

<template>
  <main class="page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Broker / Operations</p>
        <h1>Freight control tower</h1>
        <p class="muted">Operational visibility across customers, carriers, shipments, loads, tracking and finance.</p>
      </div>
    </div>

    <section class="grid-cards">
      <RouterLink class="metric-card" to="/shipments"><strong>Shipments</strong><span>Plan and execute freight</span></RouterLink>
      <RouterLink class="metric-card" to="/loads"><strong>Loads</strong><span>Tender, cover and dispatch</span></RouterLink>
      <RouterLink class="metric-card" to="/carriers"><strong>Carriers</strong><span>Compliance and capacity</span></RouterLink>
      <RouterLink class="metric-card" to="/operations/exceptions"><strong>Exceptions</strong><span>Human recovery queue</span></RouterLink>
    </section>

    <section class="panel">
      <h2>Production capabilities</h2>
      <p v-if="capabilities.isLoading.value" class="muted">Loading capabilities…</p>
      <ul v-else class="capability-list">
        <li v-for="(enabled, code) in capabilities.data.value?.capabilities ?? {}" :key="code">
          <span>{{ code }}</span>
          <strong>{{ enabled ? 'ENABLED' : 'DISABLED' }}</strong>
        </li>
      </ul>
    </section>
  </main>
</template>
