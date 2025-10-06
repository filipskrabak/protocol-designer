<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12">
        <v-img
          class="mx-auto my-6 px-2"
          max-width="500"
          src="/images/pdlogo.png"
        ></v-img>

        <v-card class="mx-auto pa-12 pb-8" max-width="448" rounded="lg">
          <div class="text-subtitle-1 text-medium-emphasis">Account</div>

          <v-text-field
            v-model="form.email"
            placeholder="Email address"
            prepend-inner-icon="mdi-email-outline"
            variant="outlined"
          ></v-text-field>

          <div
            class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between"
          >
            Password
          </div>

          <v-text-field
            v-model="form.password"
            :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
            :type="visible ? 'text' : 'password'"
            placeholder="Enter your password"
            prepend-inner-icon="mdi-lock-outline"
            @click:append-inner="visible = !visible"
            variant="outlined"
          ></v-text-field>

          <v-btn
            class="mb-8"
            color="black"
            size="large"
            block
            @click="login"
            :loading="loading"
          >
            Log In
          </v-btn>

          <v-card-text class="text-center">
            <router-link
              class="text-black text-decoration-none"
              :to="{ path: '/register' }"
              rel="noopener noreferrer"
              >
              Sign up now <v-icon icon="mdi-chevron-right"></v-icon>
            </router-link>

          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<route lang="yaml">
meta:
  layout: guest
</route>

<script lang="ts" setup>
import { ref } from "vue";
import { useAuthStore } from "@/store/AuthStore";
import router from "@/router";
import { path } from "d3";

const visible = ref(false);
const loading = ref(false);

// Stores
const authStore = useAuthStore();

const form = ref({
  email: "",
  password: "",
});

async function login() {
  loading.value = true;
  await authStore.login(form.value.email, form.value.password);

  if (await authStore.isAuthenticated()) {
    // Redirect to the dashboard
    router.push("/upload");
  } else {
    // Show error message
    console.log("Login failed");
    loading.value = false;
  }
}
</script>

<style scoped></style>
