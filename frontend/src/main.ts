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

// Get URL from environment variable

let url = window.location.origin;
url = url.replace(/:\d+$/, ""); // Strip the port number from the URL
axios.defaults.baseURL = url + ":8000";

// Set withCredentials to true to ensure cookies are sent with every request
axios.defaults.withCredentials = true;

const app = createApp(App);

registerPlugins(app);

app.mount("#app");
