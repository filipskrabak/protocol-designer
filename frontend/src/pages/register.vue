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
          <v-form ref="registerForm">
            <div class="text-subtitle-1 text-medium-emphasis">Account</div>

            <v-text-field
              v-model="form.email"
              placeholder="Email address"
              prepend-inner-icon="mdi-email-outline"
              :rules="emailRules"
              type="email"
              variant="outlined"
            ></v-text-field>

            <div
              class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between"
            >
              Username
            </div>

            <v-text-field
              v-model="form.username"
              placeholder="Username"
              prepend-inner-icon="mdi-account-outline"
              :rules="usernameRules"
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
              :rules="passwordRules"
              variant="outlined"
            ></v-text-field>

            <div
              class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between"
            >
              Repeat Password
            </div>

            <v-text-field
              v-model="form.repeatPassword"
              :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
              :type="visible ? 'text' : 'password'"
              placeholder="Repeat your password"
              prepend-inner-icon="mdi-lock-outline"
              @click:append-inner="visible = !visible"
              :rules="repeatPasswordRules"
              variant="outlined"
            ></v-text-field>

            <v-btn
              class="mb-8"
              color="black"
              size="large"
              block
              @click="register"
              :loading="loading"
            >
              Register
            </v-btn>
          </v-form>
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
import { VForm } from "vuetify/lib/components/index.mjs";

const visible = ref(false);
const loading = ref(false);
const registerForm = ref<VForm | null>(null);

let alreadyTakenEmails: string[] = [];

// Stores
const authStore = useAuthStore();

const form = ref({
  email: "",
  username: "",
  password: "",
  repeatPassword: "",
});

async function register() {
  loading.value = true;
  let result = await authStore.register(form.value.email, form.value.username, form.value.password);

  if(result === true) {
    router.push("/login");
  } else {
    loading.value = false;

    if(result.data.detail == "Sorry, that email already exists.") {
      alreadyTakenEmails.push(form.value.email);
      registerForm.value?.validate();
    } else {
      console.log(result);
    }
  }
}

// Rules

const emailRules = ref([
  (v: string) => !!v || "E-mail is required",
  (v: string) => /.+@.+\..+/.test(v) || "E-mail must be valid",
  (v: string) => !alreadyTakenEmails.includes(v) || "E-mail is already taken",
]);

const usernameRules = ref([
  (v: string) => !!v || "Username is required",
  (v: string) => (v && v.length >= 3) || "Username must be at least 3 characters",
]);

const passwordRules = ref([
  (v: string) => !!v || "Password is required",
  (v: string) => (v && v.length >= 8) || "Password must be at least 8 characters",
]);

const repeatPasswordRules = ref([
  (v: string) => !!v || "Password is required",
  (v: string) => (v && v.length >= 8) || "Password must be at least 8 characters",
  (v: string) => v === form.value.password || "Passwords do not match",
]);
</script>

<style scoped></style>
