/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables

import { useProtocolStore } from "@/store/ProtocolStore";
import { useAuthStore } from "@/store/AuthStore";
import { useProtocolLibraryStore } from "@/store/ProtocolLibraryStore";
import { RouteLocationNormalized } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    component: () => import("@/layouts/default.vue"),
    children: [
      {
        path: "",
        component: () => import("@/pages/index.vue"),
      },
      {
        path: "upload",
        component: () => import("@/pages/upload.vue"),
      },
      {
        path: "protocols",
        component: () => import("@/pages/index.vue"),
      },
      {
        path: "protocols/:id",
        component: () => import("@/pages/index.vue"),
      },
    ],
  },
  {
    path: "/login",
    component: () => import("@/layouts/guest.vue"),
    children: [
      {
        path: "",
        component: () => import("@/pages/login.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(
  async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    if (to.path !== "/login" && !(await useAuthStore().isAuthenticated())) {
      return { path: "/login" };
    }

    if (to.path === "/" && useProtocolStore().uploaded == false) {
      return { path: "/upload" };
    }

    useProtocolLibraryStore().loadAllProtocols();
  },
);

export default router;
