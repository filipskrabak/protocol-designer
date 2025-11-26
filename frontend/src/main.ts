/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from "@/plugins";

// Components
import App from "./App.vue";

// Composables
import { createApp } from "vue";

// Axios
import axios from "axios";

// Configure API base URL
// In production, API is proxied through nginx at /api
// In development, API runs on port 8000
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
axios.defaults.baseURL = isProduction ? '/api' : 'http://localhost:8000';

// Set withCredentials to true to ensure cookies are sent with every request
axios.defaults.withCredentials = true;

const app = createApp(App);

registerPlugins(app);

app.mount("#app");
