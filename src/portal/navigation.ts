import { featureNavigation } from './features/navigation'

export interface NavigationItem {
  label: string
  to: string
  description?: string
  permission?: string
  anyPermission?: string[]
  capability?: string
  group: 'Workspace' | 'Operations' | 'Customers' | 'Carriers' | 'Administration'
}

const baseNavigation: NavigationItem[] = [
  {
    label: 'Overview',
    to: '/',
    description: 'Tenant workspace and account context',
    group: 'Workspace',
  },
  {
    label: 'My profile',
    to: '/profile',
    description: 'Identity, roles and permissions',
    group: 'Workspace',
  },
]

export const navigationItems: NavigationItem[] = [...baseNavigation, ...featureNavigation]
