<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api, ApiError } from '../shared/api/client'

const props = defineProps<{
  title: string
  endpoint: string
}>()

type Row = Record<string, unknown>

const query = useQuery({
  queryKey: computed(() => [props.endpoint]),
  queryFn: () => api<Row[]>(props.endpoint),
})

const firstRow = computed<Row>(() => query.data.value?.[0] ?? {})

const errorMessage = computed(() => {
  const error = query.error.value
  if (error instanceof ApiError) {
    const correlation = error.problem.correlation_id
      ? ` Correlation: ${error.problem.correlation_id}`
      : ''
    return `${error.problem.message}${correlation}`
  }
  return error instanceof Error ? error.message : 'Unable to load data.'
})
</script>

<template>
  <main class="page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Freight Platform</p>
        <h1>{{ title }}</h1>
      </div>
      <button class="secondary" type="button" @click="query.refetch()">Refresh</button>
    </div>

    <section class="panel" aria-live="polite">
      <p v-if="query.isLoading.value" class="muted">Loading…</p>
      <div v-else-if="query.isError.value" class="error" role="alert">
        {{ errorMessage }}
      </div>
      <p v-else-if="!query.data.value?.length" class="muted">No records found.</p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th v-for="key in Object.keys(firstRow)" :key="key">{{ key }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in query.data.value" :key="index">
              <td v-for="key in Object.keys(item)" :key="key">
                {{ item[key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
