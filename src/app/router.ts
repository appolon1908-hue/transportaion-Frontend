import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../modules/DashboardPage.vue'
import ResourcePage from '../modules/ResourcePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: DashboardPage },
    { path: '/customers', component: ResourcePage, props: { title: 'Customers', endpoint: '/api/v1/customers' } },
    { path: '/carriers', component: ResourcePage, props: { title: 'Carriers', endpoint: '/api/v1/carriers' } },
    { path: '/quotes', component: ResourcePage, props: { title: 'Quotes', endpoint: '/api/v1/quotes' } },
    { path: '/shipments', component: ResourcePage, props: { title: 'Shipments', endpoint: '/api/v1/shipments' } },
    { path: '/loads', component: ResourcePage, props: { title: 'Loads', endpoint: '/api/v1/loads' } },
    { path: '/tracking', component: ResourcePage, props: { title: 'Tracking', endpoint: '/api/v1/operations/exceptions' } },
    { path: '/invoices', component: ResourcePage, props: { title: 'Invoices', endpoint: '/api/v1/invoices' } },
    { path: '/settlements', component: ResourcePage, props: { title: 'Carrier Settlements', endpoint: '/api/v1/carrier-settlements' } },
    { path: '/claims', component: ResourcePage, props: { title: 'Claims', endpoint: '/api/v1/claims' } },
    { path: '/operations/exceptions', component: ResourcePage, props: { title: 'Operational Exceptions', endpoint: '/api/v1/operations/exceptions' } },
    { path: '/admin/capabilities', component: ResourcePage, props: { title: 'Capabilities', endpoint: '/api/v1/admin/capabilities' } },
  ],
})

export default router
