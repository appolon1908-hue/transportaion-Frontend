import type { Pinia } from 'pinia'
import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'

import { useSessionStore } from './auth/session'
import { getRuntimeConfig } from './config'
import { featureRoutes } from './features/routes'

const baseRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { public: true, shell: false, title: 'Sign in' },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('./views/AuthCallbackView.vue'),
    meta: { public: true, shell: false, title: 'Completing sign in' },
  },
  {
    path: '/select-organization',
    name: 'select-organization',
    component: () => import('./views/TenantSelectionView.vue'),
    meta: { shell: false, title: 'Select organization' },
  },
  {
    path: '/session-error',
    name: 'session-error',
    component: () => import('./views/SessionErrorView.vue'),
    meta: { public: true, shell: false, title: 'Session unavailable' },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('./views/ForbiddenView.vue'),
    meta: { shell: false, title: 'Access denied' },
  },
  {
    path: '/',
    name: 'overview',
    component: () => import('./views/OverviewView.vue'),
    meta: { title: 'Overview' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('./views/ProfileView.vue'),
    meta: { title: 'My profile' },
  },
  ...featureRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('./views/NotFoundView.vue'),
    meta: { public: true, shell: false, title: 'Page not found' },
  },
]

function returnTarget(route: RouteLocationNormalized): string {
  return route.fullPath.startsWith('/') && !route.fullPath.startsWith('//') ? route.fullPath : '/'
}

export function createPortalRouter(pinia: Pinia) {
  const router = createRouter({
    history: createWebHistory(),
    routes: baseRoutes,
    scrollBehavior: () => ({ top: 0 }),
  })

  router.beforeEach(async (to) => {
    const session = useSessionStore(pinia)
    if (to.name === 'auth-callback') return true

    await session.initialize()

    if (to.meta.public) {
      if (to.name === 'login' && session.authenticated) return { name: 'overview' }
      return true
    }

    if (session.status === 'anonymous' || session.status === 'booting') {
      return { name: 'login', query: { returnTo: returnTarget(to) } }
    }
    if (session.status === 'error') {
      return to.name === 'session-error' ? true : { name: 'session-error' }
    }
    if (session.status === 'selecting-tenant' && to.name !== 'select-organization') {
      return { name: 'select-organization', query: { returnTo: returnTarget(to) } }
    }
    if (!session.authenticated && to.name !== 'select-organization') {
      return { name: 'login', query: { returnTo: returnTarget(to) } }
    }

    if (to.meta.permission && !session.hasPermission(to.meta.permission)) {
      return { name: 'forbidden', query: { permission: to.meta.permission } }
    }
    if (to.meta.anyPermission?.length && !session.hasAnyPermission(to.meta.anyPermission)) {
      return { name: 'forbidden', query: { permission: to.meta.anyPermission.join(' or ') } }
    }
    if (to.meta.capability && !session.hasCapability(to.meta.capability)) {
      return { name: 'forbidden', query: { capability: to.meta.capability } }
    }
    return true
  })

  router.afterEach((to) => {
    let appName = 'Freight Platform'
    try {
      appName = getRuntimeConfig().appName
    } catch {
      // The session error view presents the configuration failure.
    }
    document.title = to.meta.title ? `${to.meta.title} · ${appName}` : appName
  })

  return router
}
