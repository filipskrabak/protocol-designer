import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

// Tab number → docs path — must stay in sync with the tab indices in index.vue
const TAB_DOCS: Readonly<Record<number, string>> = {
  1: '/docs/guide/protocol-header',
  2: '/docs/guide/properties',
  3: '/docs/guide/encapsulation',
  4: '/docs/guide/efsm',
  5: '/docs/guide/cpn',
}

// Route path → docs path for pages outside index.vue
const ROUTE_DOCS: Readonly<Record<string, string>> = {
  '/upload': '/docs/guide/upload',
  '/login': '/docs/',
  '/register': '/docs/',
}

// Module-level singleton — mirrors the useSidebar pattern
const currentTab = ref<number>(1)

export function useHelpUrl() {
  const route = useRoute()

  const helpUrl = computed<string>(() => {
    const routeDoc = ROUTE_DOCS[route.path]
    if (routeDoc) return routeDoc
    return TAB_DOCS[currentTab.value] ?? '/docs/'
  })

  const setCurrentTab = (tab: number): void => {
    currentTab.value = tab
  }

  return { currentTab, helpUrl, setCurrentTab }
}
