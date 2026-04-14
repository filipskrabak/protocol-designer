<template>
  <div class="landing-page">
    <!-- ===== NAVBAR ===== -->
    <v-app-bar
      :elevation="scrolled ? 4 : 0"
      :class="scrolled ? 'navbar-solid' : 'navbar-transparent'"
      class="navbar"
    >
      <v-toolbar-title>
        <v-img
          src="/images/pdlogo.png"
          max-width="220"
          class="logo-invert"
        />
      </v-toolbar-title>
      <v-spacer />
      <v-btn variant="text" class="text-white me-2" href="/docs">
        Docs
      </v-btn>
      <v-btn variant="text" class="text-white me-2" :to="{ path: '/login' }">
        Log In
      </v-btn>
      <v-btn
        variant="flat"
        color="cyan-lighten-1"
        class="text-black font-weight-bold me-4"
        :to="{ path: '/register' }"
      >
        Register
      </v-btn>
    </v-app-bar>

    <v-main class="landing-main">

      <!-- ===== HERO SECTION ===== -->
      <section class="hero-section">
        <!-- Animated background "packet fields" -->
        <div class="packet-bg">
          <div
            v-for="(field, i) in packetFields"
            :key="i"
            class="packet-field"
            :style="field.style"
          >
            <span class="packet-label">{{ field.label }}</span>
          </div>
        </div>

        <v-container class="hero-content">
          <v-row justify="center" align="center" class="fill-height">
            <v-col cols="12" md="9" lg="8" class="text-center">
              <v-chip
                class="mb-6"
                color="cyan-lighten-1"
                variant="tonal"
                prepend-icon="mdi-flask-outline"
                size="small"
              >
                Open Source Tool
              </v-chip>

              <h1 class="hero-title mb-4">
                Design, Model &amp; Verify<br />
                <span class="hero-accent">Network Protocols</span><br />
                Visually
              </h1>

              <p class="hero-subtitle mb-10">
                Craft protocol header diagrams, model state machines, build
                Colored Petri Nets, and formally verify protocol behavior.
                All within your browser.
              </p>

              <div class="d-flex flex-wrap justify-center ga-4">
                <v-btn
                  size="x-large"
                  color="cyan-lighten-1"
                  class="text-black font-weight-bold px-10"
                  :to="{ path: '/register' }"
                  prepend-icon="mdi-account-plus-outline"
                >
                  Get Started - Free
                </v-btn>
                <v-btn
                  size="x-large"
                  variant="outlined"
                  color="white"
                  class="px-10"
                  @click="scrollToFeatures"
                  append-icon="mdi-chevron-down"
                >
                  See Features
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-container>

        <!-- Hero gradient fade at bottom -->
        <div class="hero-fade-bottom" />
      </section>

      <!-- ===== STATS STRIP ===== -->
      <section class="stats-strip">
        <v-container>
          <v-row justify="center" class="text-center">
            <v-col
              cols="6"
              sm="3"
              v-for="stat in stats"
              :key="stat.label"
            >
              <div
                class="stat-number"
                :class="{ 'stat-loading': stat.value === '\u2014' }"
              >{{ stat.value }}</div>
              <div class="stat-label text-medium-emphasis">{{ stat.label }}</div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- ===== FEATURES SECTION ===== -->
      <section id="features" class="features-section">
        <v-container>
          <div class="text-center mb-12">
            <v-chip
              class="mb-4"
              color="deep-purple-lighten-2"
              variant="tonal"
              size="small"
            >
              Everything you need
            </v-chip>
            <h2 class="section-title">One tool for the entire workflow</h2>
            <p class="section-subtitle text-medium-emphasis">
              From header design to formal verification, Protocol Designer covers
              every stage of protocol engineering.
            </p>
          </div>

          <v-row>
            <v-col
              v-for="(feature, i) in features"
              :key="feature.title"
              cols="12"
              sm="6"
              lg="4"
            >
              <v-card
                class="feature-card h-100"
                rounded="xl"
                elevation="0"
                v-intersect="{ handler: onIntersect, options: { threshold: 0.2 } }"
              >
                <v-card-text class="pa-6">
                  <div class="feature-icon-wrap mb-4">
                    <v-icon
                      :icon="feature.icon"
                      :color="feature.color"
                      size="32"
                    />
                  </div>
                  <h3 class="feature-title mb-2">{{ feature.title }}</h3>
                  <p class="text-medium-emphasis">{{ feature.description }}</p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- ===== HOW IT WORKS ===== -->
      <section class="howto-section">
        <v-container>
          <div class="text-center mb-12">
            <v-chip
              class="mb-4"
              color="cyan-lighten-1"
              variant="tonal"
              size="small"
            >
              Simple workflow
            </v-chip>
            <h2 class="section-title">From idea to formal verification in minutes</h2>
          </div>

          <!-- Steps row: 4 cards with arrow connectors -->
          <div class="steps-row">
            <template v-for="(step, i) in steps" :key="step.title">
              <div class="step-card">
                <div class="step-icon-ring" :style="{ borderColor: step.color + '99' }">
                  <v-icon :icon="step.icon" size="24" :color="step.color" />
                </div>
                <div class="step-num mt-4 mb-2">{{ step.number }}</div>
                <h4 class="step-card-title mb-2">{{ step.title }}</h4>
                <p class="text-medium-emphasis text-body-2">{{ step.description }}</p>
              </div>
              <div v-if="i < steps.length - 1" class="step-arrow">
                <v-icon icon="mdi-chevron-right" color="rgba(255,255,255,0.2)" size="32" />
              </div>
            </template>
          </div>
        </v-container>
      </section>

      <!-- ===== PROTOCOL PREVIEW ===== -->
      <section class="preview-section">
        <v-container>
          <v-row align="center" justify="center">
            <v-col cols="12" md="5" class="mb-8 mb-md-0">
              <v-chip
                class="mb-4"
                color="deep-purple-lighten-2"
                variant="tonal"
                size="small"
              >
                Live output
              </v-chip>
              <h2 class="section-title mb-4">This is what you build</h2>
              <p class="text-medium-emphasis mb-6">
                Protocol Designer renders your protocol as a structured bit-field
                diagram - just like in the RFCs. Export to SVG, P4, or PNML in
                one click.
              </p>
              <div class="d-flex flex-wrap ga-3">
                <v-chip prepend-icon="mdi-file-image-outline" color="cyan-darken-1" variant="tonal" size="small">SVG</v-chip>
                <v-chip prepend-icon="mdi-code-braces" color="cyan-darken-1" variant="tonal" size="small">P4</v-chip>
                <v-chip prepend-icon="mdi-graph-outline" color="cyan-darken-1" variant="tonal" size="small">PNML</v-chip>
                <v-chip prepend-icon="mdi-xml" color="cyan-darken-1" variant="tonal" size="small">CPN Tools XML</v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="7">
              <v-card class="preview-card" rounded="xl" elevation="0">
                <v-card-text class="pa-2 pa-md-4">
                  <!-- Screenshot placeholder — replace src with your image -->
                  <div class="preview-placeholder">
                    <v-icon icon="mdi-image-area" size="64" color="rgba(76,195,247,0.3)" class="mb-4" />
                    <p class="text-medium-emphasis text-body-2 mb-1">App screenshot placeholder</p>
                    <p class="text-caption" style="color: rgba(76,195,247,0.5)">
                      Replace this block with<br /><code>&lt;img src="your-screenshot.png" /&gt;</code>
                    </p>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- ===== CTA BAND ===== -->
      <section class="cta-section">
        <v-container>
          <v-card class="cta-card" rounded="xl" elevation="0">
            <v-card-text class="pa-10 pa-md-16 text-center">
              <h2 class="cta-title mb-4">
                Start designing protocols today.
                <span class="hero-accent">It's free.</span>
              </h2>
              <p class="text-medium-emphasis mb-8 cta-subtitle">
                No installation. No configuration. Just open your browser and start
                engineering network protocols with precision.
              </p>
              <v-btn
                size="x-large"
                color="cyan-lighten-1"
                class="text-black font-weight-bold px-12"
                :to="{ path: '/register' }"
                prepend-icon="mdi-account-plus-outline"
              >
                Create Your Account
              </v-btn>
              <div class="mt-6">
                <router-link
                  :to="{ path: '/login' }"
                  class="text-medium-emphasis text-decoration-none"
                  style="font-size: 0.875rem"
                >
                  Already have an account? Log in →
                </router-link>
              </div>
            </v-card-text>
          </v-card>
        </v-container>
      </section>

      <!-- ===== FOOTER ===== -->
      <v-footer class="footer-dark">
        <v-row justify="center" no-gutters class="py-4">
          <v-col class="text-center" cols="12">
            <v-img
              src="/images/pdlogo.png"
              max-width="160"
              class="mx-auto mb-3 logo-invert"
            />
          </v-col>
          <v-col class="text-center" cols="12">
            <v-btn
              variant="text"
              class="mx-2 text-white"
              href="/docs"
              prepend-icon="mdi-book-open-outline"
            >
              Docs
            </v-btn>
            <v-btn
              icon="mdi-github"
              variant="text"
              class="mx-2 text-white"
              href="https://github.com/filipskrabak/protocol-designer"
              target="_blank"
            />
            <v-btn
              variant="text"
              class="mx-2"
              href="https://www.fiit.stuba.sk"
              target="_blank"
            >
              <v-img src="/images/STU-FIIT-zcv.png" width="50" class="logo-invert" />
            </v-btn>
          </v-col>
          <v-col class="text-center mt-3 text-medium-emphasis text-caption" cols="12">
            {{ new Date().getFullYear() }} — Protocol Designer · STU FIIT
          </v-col>
        </v-row>
      </v-footer>

    </v-main>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";

// -- Navbar scroll effect -----------------------------------------------------
const scrolled = ref(false);
function onScroll() {
  scrolled.value = window.scrollY > 60;
}
onMounted(() => {
  window.addEventListener("scroll", onScroll);
  fetchStats();
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

function scrollToFeatures() {
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
}

// -- Animated background packet fields ----------------------------------------
const fieldNames = [
  "Version", "IHL", "DSCP", "ECN", "Total Length",
  "Identification", "Flags", "Fragment Offset",
  "TTL", "Protocol", "Header Checksum", "Src IP",
  "Dst IP", "Src Port", "Dst Port", "Seq Num",
  "Ack Num", "Data Offset", "Window", "Checksum",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

const packetFields = fieldNames.map((name) => {
  // Width based on text length: ~7px per char + padding
  const width = name.length * 7 + 24;
  const top = randomBetween(5, 90);
  const duration = randomBetween(18, 38);
  // Negative delay = start mid-animation, so fields are already spread across screen on load
  const delay = -randomBetween(0, duration);
  const opacity = randomBetween(0.04, 0.13);
  return {
    label: name,
    style: {
      width: `${width}px`,
      top: `${top}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      opacity,
    },
  };
});

// -- Stats -------------------------------------------------------------------
interface Stat { value: string; label: string }

const stats = ref<Stat[]>([
  { value: "5+", label: "Export Formats" },
  { value: "—", label: "Protocols Designed" },
  { value: "—", label: "GitHub Stars" },
  { value: "100%", label: "Browser-based" },
]);

async function fetchStats() {
  const [protocolsRes, starsRes] = await Promise.allSettled([
    axios.get("/stats"),
    // GitHub API requires no credentials (their CORS uses wildcard origin)
    fetch("https://api.github.com/repos/filipskrabak/protocol-designer").then((r) => r.json()),
  ]);

  stats.value = [
    { value: "5+", label: "Export Formats" },
    {
      value: protocolsRes.status === "fulfilled"
        ? String(protocolsRes.value.data.protocol_count)
        : "—",
      label: "Protocols Designed",
    },
    {
      value: starsRes.status === "fulfilled"
        ? String((starsRes.value as any).stargazers_count)
        : "—",
      label: "GitHub Stars",
    },
    { value: "100%", label: "Browser-based" },
  ];
}

// -- Features -----------------------------------------------------------------
const features = [
  {
    icon: "mdi-view-grid-outline",
    color: "cyan-lighten-1",
    title: "Visual Header Designer",
    description:
      "What you see is what you get (WYSIWYG) bit-field editor for crafting protocol headers. See your packet structure in real time, similarly to how it appears in RFCs.",
  },
  {
    icon: "mdi-state-machine",
    color: "deep-purple-lighten-2",
    title: "Extended FSM Modeling",
    description:
      "Build Extended Finite State Machines for protocol behavior. Add guards, actions, and variables with a graphical node editor.",
  },
  {
    icon: "mdi-graph",
    color: "teal-lighten-2",
    title: "Colored Petri Nets",
    description:
      "Model concurrent protocol behavior using Colored Petri Nets (CPN). CPNs are a powerful formalism for capturing complex protocol workflows.",
  },
  {
    icon: "mdi-layers-outline",
    color: "amber-lighten-2",
    title: "Protocol Encapsulation",
    description:
      "Define parent/child protocol relationships. Model TCP/IP stack layers or your custom protocol stack with field-level encapsulation mapping.",
  },
  {
    icon: "mdi-shield-check-outline",
    color: "green-lighten-2",
    title: "Formal Verification",
    description:
      "Detect deadlocks, verify liveness and reachability automatically. Get instant counterexamples for property violations.",
  },
  {
    icon: "mdi-file-export-outline",
    color: "orange-lighten-2",
    title: "Multi-Format Export",
    description:
      "Export to SVG, P4 (programmable data planes), PNML, CPN Tools XML, SCXML and more. Integrate directly into your engineering workflow.",
  },
];

// -- Feature card intersection observer ---------------------------------------

function onIntersect(isIntersecting: boolean, entries: IntersectionObserverEntry[]) {
  if (isIntersecting) {
    const entry = entries[0];
    const el = entry.target as HTMLElement;
    el.classList.add("feature-visible");
  }
}

// -- How it works steps --------------------------------------------------------
const steps = [
  {
    number: "01",
    icon: "mdi-upload-outline",
    color: "cyan-darken-1",
    title: "Create or Import",
    description: "Start from a blank canvas or import an existing SVG protocol description file.",
  },
  {
    number: "02",
    icon: "mdi-pencil-ruler",
    color: "deep-purple-lighten-2",
    title: "Design the Header",
    description: "Add fields, set lengths, configure options and encapsulation relationships visually.",
  },
  {
    number: "03",
    icon: "mdi-state-machine",
    color: "teal-lighten-2",
    title: "Model Behavior",
    description: "Build EFSMs or Colored Petri Nets that capture your protocol's dynamic behavior.",
  },
  {
    number: "04",
    icon: "mdi-check-circle-outline",
    color: "green-lighten-2",
    title: "Verify & Export",
    description: "Run formal analysis to catch bugs, then export your protocol in the format you need.",
  },
];
</script>

<style scoped>
/* -- Global / variables ---------------------------------------------------- */
:root {
  --bg-deep: #0d1117;
  --bg-surface: #161b22;
  --accent-cyan: #4fc3f7;
  --accent-purple: #7c4dff;
  --text-muted: #8b949e;
}

/* -- Root wrapper: must fill the full flex-row v-layout width ------------- */
.landing-page {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

/* -- Navbar ---------------------------------------------------------------- */
.navbar {
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}
.navbar-transparent {
  background-color: transparent !important;
}
.navbar-solid {
  background-color: #0d1117 !important;
}

/* -- Logo on dark bg ------------------------------------------------------- */
.logo-invert {
  filter: invert(1);
}

/* -- Landing main ---------------------------------------------------------- */
.landing-main {
  background-color: #0d1117;
  color: #e8eaf6;
  padding-top: 0 !important;
}

/* -- Hero ------------------------------------------------------------------ */
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: radial-gradient(ellipse at 60% 0%, rgba(76, 195, 247, 0.08) 0%, transparent 60%),
              radial-gradient(ellipse at 20% 80%, rgba(124, 77, 255, 0.08) 0%, transparent 50%),
              #0d1117;
  overflow: hidden;
  padding-top: 64px;
}

.hero-content {
  position: relative;
  z-index: 2;
  padding-top: 80px;
  padding-bottom: 80px;
}

.hero-title {
  font-size: clamp(2.4rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: #e8eaf6;
}

.hero-accent {
  background: linear-gradient(135deg, #4fc3f7 0%, #7c4dff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: #8b949e;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.7;
}

.hero-fade-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to bottom, transparent, #0d1117);
  z-index: 1;
}

/* -- Packet field animations ----------------------------------------------- */
.packet-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.packet-field {
  position: absolute;
  left: -220px;
  height: 36px;
  border: 1px solid rgba(76, 195, 247, 0.35);
  border-radius: 4px;
  background: rgba(76, 195, 247, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: drift linear infinite;
  white-space: nowrap;
  padding: 0 8px;
}

.packet-label {
  font-family: "Courier New", monospace;
  font-size: 11px;
  color: rgba(76, 195, 247, 0.7);
  letter-spacing: 0.05em;
}

@keyframes drift {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(100vw + 240px)); }
}

/* -- Stats strip ----------------------------------------------------------- */
.stats-strip {
  background: #161b22;
  padding: 40px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.stat-number {
  font-size: 2.4rem;
  font-weight: 800;
  background: linear-gradient(135deg, #4fc3f7, #7c4dff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: opacity 0.3s ease;
}

.stat-number.stat-loading {
  opacity: 0.35;
}

.stat-label {
  font-size: 0.875rem;
  margin-top: 4px;
}

/* -- Features -------------------------------------------------------------- */
.features-section {
  padding: 100px 0;
  background: #0d1117;
}

.section-title {
  font-size: clamp(1.6rem, 4vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #e8eaf6;
}

.section-subtitle {
  font-size: 1.05rem;
  max-width: 560px;
  margin: 12px auto 0;
  line-height: 1.7;
}

.feature-card {
  background: #161b22 !important;
  border: 1px solid rgba(255,255,255,0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  opacity: 0;
  transform: translateY(24px);
}

.feature-card.feature-visible {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  border-color: rgba(76, 195, 247, 0.4) !important;
  box-shadow: 0 0 24px rgba(76, 195, 247, 0.1) !important;
  transform: translateY(-4px) !important;
}

.feature-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(76, 195, 247, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #e8eaf6;
}

/* -- How it works — custom step cards --------------------------------------- */
.howto-section {
  padding: 80px 0 100px;
  background: #0a0e14;
}

.steps-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.step-card {
  flex: 1;
  min-width: 0;
  background: #161b22;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 28px 20px;
  text-align: center;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.step-card:hover {
  border-color: rgba(76, 195, 247, 0.3);
  box-shadow: 0 0 20px rgba(76, 195, 247, 0.06);
}

.step-icon-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(76, 195, 247, 0.5);
  background: rgba(76, 195, 247, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.step-num {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #4fc3f7;
  font-family: "Courier New", monospace;
}

.step-card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e8eaf6;
}

.step-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding-left: 4px;
  padding-right: 4px;
}

/* -- Protocol preview ------------------------------------------------------ */
.preview-section {
  padding: 80px 0 100px;
  background: #0d1117;
}

.preview-card {
  background: #161b22 !important;
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 2px dashed rgba(76, 195, 247, 0.2);
  border-radius: 10px;
  padding: 40px 24px;
  text-align: center;
}

.preview-placeholder code {
  font-size: 0.78rem;
  color: rgba(76, 195, 247, 0.7);
  background: rgba(76, 195, 247, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
}

/* -- CTA Band -------------------------------------------------------------- */
.cta-section {
  padding: 80px 0 100px;
  background: #0a0e14;
}

.cta-card {
  background: linear-gradient(135deg, #161b22 0%, #1a1040 100%) !important;
  border: 1px solid rgba(124, 77, 255, 0.25) !important;
}

.cta-title {
  font-size: clamp(1.6rem, 4vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #e8eaf6;
}

.cta-subtitle {
  max-width: 520px;
  margin: 0 auto;
  font-size: 1.05rem;
  line-height: 1.7;
}

/* -- Footer ---------------------------------------------------------------- */
.footer-dark {
  background-color: #0a0e14 !important;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 32px 16px;
}
</style>
