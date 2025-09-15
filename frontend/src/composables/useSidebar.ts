import { ref } from 'vue'

// Global state for sidebar
const drawer = ref<boolean>(true)
const rail = ref<boolean>(false)

export function useSidebar() {
  const toggleDrawer = () => {
    drawer.value = !drawer.value
  }

  const toggleRail = () => {
    rail.value = !rail.value
  }

  return {
    drawer,
    rail,
    toggleDrawer,
    toggleRail
  }
}
