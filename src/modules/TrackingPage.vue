<script setup lang="ts">
import { ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api, ApiError } from '../shared/api/client'

type TrackingEvent = {
  id: string
  event_type: string
  occurred_at: string
  latitude?: string | number | null
  longitude?: string | number | null
  payload?: Record<string, unknown>
}

const loadId = ref('')
const activeLoadId = ref('')

const tracking = useQuery({
  queryKey: ['tracking', activeLoadId],
  enabled: () => Boolean(activeLoadId.value),
  queryFn: () => api<TrackingEvent[]>(`/api/v1/loads/${activeLoadId.value}/tracking`),
})

function search() {
  activeLoadId.value = loadId.value.trim()
}

function errorText(): string {
  const error = tracking.error.value
  if (error instanceof ApiError) {
    return `${error.problem.message}${error.problem.correlation_id ? ` Correlation: ${error.problem.correlation_id}` : ''}`
  }
  return error instanceof Error ? error.message : 'Unable to load tracking.'
}
</script>

<template>
  <main class="page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Visibility</p>
        <h1>Load tracking</h1>
        <p class="muted">Inspect the durable tracking-event history for a specific load.</p>
      </div>
    </div>

    <section class="panel tracking-search">
      <label for="load-id"><strong>Load ID</strong></label>
      <div class="tracking-input-row">
        <input id="load-id" v-model="loadId" type="text" autocomplete="off" placeholder="Load UUID" @keyup.enter="search" />
        <button class="secondary" type="button" :disabled="!loadId.trim()" @click="search">Load tracking</button>
      </div>
    </section>

    <section v-if="activeLoadId" class="panel tracking-results" aria-live="polite">
      <p v-if="tracking.isLoading.value" class="muted">Loading tracking events…</p>
      <div v-else-if="tracking.isError.value" class="error" role="alert">{{ errorText() }}</div>
      <p v-else-if="!tracking.data.value?.length" class="muted">No tracking events have been recorded for this load.</p>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Event</th><th>Latitude</th><th>Longitude</th></tr></thead>
          <tbody>
            <tr v-for="event in tracking.data.value" :key="event.id">
              <td>{{ event.occurred_at }}</td>
              <td>{{ event.event_type }}</td>
              <td>{{ event.latitude ?? '—' }}</td>
              <td>{{ event.longitude ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
