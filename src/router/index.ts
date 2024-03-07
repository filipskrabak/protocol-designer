/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router/auto'
import { setupLayouts } from 'virtual:generated-layouts'
import { useProtocolStore } from '@/store/ProtocolStore'
import { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'


const routes = [
  {
    path: '/',
    component: () => import('../pages/Index.vue'),

  },
  {
    path: '/upload',
    component: () => import('../pages/Upload.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  extendRoutes: setupLayouts,
  routes,
})

router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized ) => {
  if(to.name === '/' && useProtocolStore().uploaded == false) {
    return { name: '/upload' }
  }
});

export default router
