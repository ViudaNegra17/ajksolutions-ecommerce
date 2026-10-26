<script setup lang="ts">
import { ref } from 'vue'

const imageFailed = ref(false)
</script>

<template>
  <section class="home-hero" aria-labelledby="home-hero">
    <UContainer class="home-hero__layout">
      <div class="home-hero__content">
        <p class="home-hero__eyebrow">Tecnología con atención directa</p>
        <h1 id="home-hero" class="home-hero__heading">
          <span class="home-hero__line">Para trabajar,{{ ' ' }}</span>
          <span class="home-hero__line">crear y conectar.</span>
        </h1>
        <p class="home-hero__description">
          Equipos, licencias digitales y soporte técnico. Encuentra tu solución y coordina los siguientes
          pasos con AJKSolutionS.
        </p>
        <div class="home-hero__actions">
          <UButton
            to="/productos"
            label="Ver productos"
            class="home-hero__action home-hero__action--primary"
            size="lg"
            trailing
            icon="i-lucide-arrow-right"
          />
          <UButton
            to="/servicios"
            label="Solicitar servicio"
            class="home-hero__action home-hero__action--secondary"
            color="neutral"
            variant="outline"
            size="lg"
          />
        </div>
      </div>
      <div class="home-hero__visual">
        <NuxtImg
          v-if="!imageFailed"
          src="/images/hero/ajksolutions-hero-ecosystem.webp"
          alt="Equipos, licencias digitales, accesorios, herramientas y soporte técnico de AJKSolutionS"
          width="1448"
          height="1086"
          sizes="100vw sm:640px lg:55vw xl:752px"
          srcset="/images/hero/ajksolutions-hero-ecosystem-448.webp 448w, /images/hero/ajksolutions-hero-ecosystem-640.webp 640w, /images/hero/ajksolutions-hero-ecosystem-752.webp 752w, /images/hero/ajksolutions-hero-ecosystem.webp 1448w"
          format="webp"
          :quality="88"
          loading="eager"
          fetchpriority="high"
          class="home-hero__asset"
          @error="imageFailed = true"
        />
        <div v-else class="home-hero__brand">
          <AppLogo class="home-hero__logo" loading="eager" fetchpriority="high" />
          <p class="home-hero__brand-caption">Productos · Licencias digitales · Servicios tecnológicos</p>
        </div>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.home-hero {
  position: relative;
  border-bottom: 1px solid var(--ui-border);
  background:
    radial-gradient(ellipse at 90% 20%, #dcefff 0, transparent 55%),
    linear-gradient(120deg, #fff 0%, #eff8ff 100%);
}
.home-hero__layout {
  position: relative;
  display: grid;
  align-items: center;
  gap: 2rem;
  padding-block: 2rem;
}
.home-hero__content {
  justify-self: center;
  width: 100%;
  min-width: 0;
  max-width: 43rem;
}
.home-hero__eyebrow {
  color: var(--color-ajk-700);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.home-hero__heading {
  margin-top: 1rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(2.15rem, 8.8vw, 3.5rem);
  font-weight: 750;
  line-height: 1.12;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.home-hero__line {
  display: block;
}
.home-hero__description {
  max-width: 36rem;
  margin-top: 1.25rem;
  color: var(--ui-text);
  font-size: 1rem;
  line-height: 1.8;
}
.home-hero__actions {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.home-hero__action {
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
}
.home-hero__action--primary {
  background-color: var(--color-ajk-700);
  color: #fff;
}
.home-hero__action--primary:hover {
  background-color: var(--color-ajk-800);
}
.home-hero__action--secondary {
  background-color: #fff;
  color: var(--ui-text-highlighted);
}
.home-hero__action--secondary:hover {
  background-color: var(--color-ajk-50);
}
.home-hero__action:focus-visible {
  outline: 3px solid var(--color-ajk-700);
  outline-offset: 4px;
}
.home-hero__visual {
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  justify-self: center;
  width: 100%;
  min-width: 0;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--color-ajk-100);
  border-radius: 1.5rem;
  background: #fff;
  box-shadow: 0 14px 48px -32px rgb(16 78 117 / 30%);
}
.home-hero__asset {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: contain;
}
.home-hero__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 1.25rem;
}
.home-hero__logo {
  width: min(100%, 26rem);
  height: auto;
  max-height: calc(100% - 3rem);
  min-height: 0;
  object-fit: contain;
}
.home-hero__brand-caption {
  max-width: 25rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.6;
  text-align: center;
}

@media (min-width: 640px) {
  .home-hero__layout {
    gap: 2.5rem;
    padding-block: 2.75rem;
  }
  .home-hero__eyebrow {
    font-size: 0.8125rem;
  }
  .home-hero__heading {
    font-size: clamp(3rem, 6vw, 4rem);
  }
  .home-hero__description {
    font-size: 1.125rem;
  }
  .home-hero__visual {
    max-width: 40rem;
  }
  .home-hero__brand-caption {
    font-size: 0.875rem;
  }
}

@media (min-width: 768px) {
  .home-hero__actions {
    display: flex;
    flex-wrap: wrap;
  }
  .home-hero__action {
    width: auto;
  }
}

@media (min-width: 1024px) and (min-aspect-ratio: 6/5) {
  .home-hero__layout {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(2rem, 3.5vw, 3.5rem);
    padding-block: clamp(1.25rem, 4dvh, 3rem);
  }
  .home-hero__heading {
    font-size: clamp(2.5rem, 3.5vw, 4rem);
  }
  .home-hero__visual {
    width: min(100%, 80dvh);
    max-width: none;
  }
}

@media (min-width: 1024px) and (max-aspect-ratio: 6/5) {
  .home-hero__layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
  }
}
</style>
