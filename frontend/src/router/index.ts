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
import { useProtocolRenderStore } from "@/store/ProtocolRenderStore";

const publicRoutes = ["/login", "/register", "/landing"];

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
        name: "protocol",
        component: () => import("@/pages/index.vue"),
      },
    ],
  },
  {
    path: "/landing",
    component: () => import("@/layouts/landing.vue"),
    children: [
      {
        path: "",
        component: () => import("@/pages/landing.vue"),
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
  {
    path: "/register",
    component: () => import("@/layouts/guest.vue"),
    children: [
      {
        path: "",
        component: () => import("@/pages/register.vue"),
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
    if (
      !publicRoutes.includes(to.path) &&
      !(await useAuthStore().isAuthenticated())
    ) {
      return { path: "/landing" };
    }

    if (to.path === "/" && useProtocolStore().uploaded == false) {
      return { path: "/upload" };
    }

    useProtocolLibraryStore().loadAllProtocols();
  },
);

export default router;
