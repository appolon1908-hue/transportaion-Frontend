import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import { ApiError } from './api/client'
import { getRuntimeConfig } from './config'
import { createPortalRouter } from './router'
import './styles.css'

function renderConfigurationFailure(error: unknown): void {
  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) return
  const container = document.createElement('main')
  container.className = 'fatal-configuration'
  const heading = document.createElement('h1')
  heading.textContent = 'Portal configuration unavailable'
  const message = document.createElement('p')
  message.textContent =
    'The portal cannot start until its runtime API and identity settings are configured safely.'
  const code = document.createElement('code')
  code.textContent = error instanceof Error ? error.message : 'RUNTIME_CONFIGURATION_FAILED'
  container.append(heading, message, code)
  root.replaceChildren(container)
}

try {
  getRuntimeConfig()

  const pinia = createPinia()
  const router = createPortalRouter(pinia)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500 && error.status !== 429) return false
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.use(VueQueryPlugin, { queryClient })
  app.config.errorHandler = (error) => {
    // Do not serialize application state, tokens, request bodies, or provider
    // responses into the browser console. Production observability uses safe
    // correlation IDs returned by the APIs.
    const message = error instanceof Error ? error.name : 'PortalError'
    console.error(message)
  }
  app.mount('#app')
} catch (error) {
  renderConfigurationFailure(error)
}
