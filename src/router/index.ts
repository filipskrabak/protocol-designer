/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from "vue-router/auto";
import { setupLayouts } from "virtual:generated-layouts";
import { useProtocolStore } from "@/store/ProtocolStore";
import { RouteLocationNormalized } from "vue-router";

/*
const routes = [
  {
    path: '/upload',
    component: () => import('../pages/Upload.vue'),
  },
]*/

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  extendRoutes: setupLayouts,
  //routes,
});

router.beforeEach(
  async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    if (to.path === "/" && useProtocolStore().uploaded == false) {
      return { path: "/upload" };
    }
  },
);

export default router;
