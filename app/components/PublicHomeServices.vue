<script setup lang="ts">
import type { PublicServiceCard } from '#shared/types/services'

defineProps<{ services: PublicServiceCard[] }>()
</script>

<template>
  <section class="home-services" aria-labelledby="home-services">
    <UContainer
      class="home-services__layout"
      :class="{ 'home-services__layout--single': services.length === 1 }"
    >
      <div class="home-services__intro">
        <p class="home-services__eyebrow">Soporte para seguir adelante</p>
        <h2 id="home-services" class="home-services__heading">¿Tu equipo necesita atención?</h2>
        <p class="home-services__description">
          Encuentra un servicio, describe lo que ocurre y solicita atención. Coordinamos contigo el
          diagnóstico y los siguientes pasos.
        </p>
        <UButton
          to="/servicios"
          label="Ver servicios"
          size="lg"
          trailing
          icon="i-lucide-arrow-right"
          class="home-services__catalog"
        />
      </div>
      <div v-if="services.length" class="home-services__grid">
        <NuxtLink
          v-for="service in services"
          :key="service.slug"
          :to="`/servicios/${service.slug}`"
          :aria-labelledby="`home-service-${service.slug}-title home-service-${service.slug}-cta`"
          class="home-services__card"
        >
          <NuxtImg
            v-if="service.image"
            :src="service.image"
            :alt="service.name"
            width="640"
            height="360"
            sizes="100vw sm:640px lg:50vw xl:640px"
            loading="lazy"
            class="home-services__image"
          />
          <div class="home-services__body">
            <div class="home-services__category">
              <span class="home-services__icon" aria-hidden="true">
                <UIcon name="i-lucide-wrench" class="size-6" />
              </span>
              <span v-if="service.category.name">{{ service.category.name }}</span>
            </div>
            <h3 :id="`home-service-${service.slug}-title`" class="home-services__title">
              {{ service.name }}
            </h3>
            <p v-if="service.shortDescription" class="home-services__text">
              {{ service.shortDescription }}
            </p>
            <div class="home-services__footer">
              <PublicServicePrice :price="service.price" />
              <span :id="`home-service-${service.slug}-cta`" class="home-services__cta">
                Solicitar servicio
                <UIcon name="i-lucide-arrow-right" class="size-5 shrink-0" aria-hidden="true" />
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
      <div v-else class="home-services__empty">
        <UIcon name="i-lucide-wrench" class="size-8 text-primary" aria-hidden="true" />
        <p class="home-services__title">Servicios disponibles</p>
        <p class="home-services__text">Los servicios publicados se mostrarán aquí.</p>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.home-services {
  padding-block: clamp(2.5rem, 5vw, 4.5rem);
  border-block: 1px solid var(--color-ajk-100);
  background:
    radial-gradient(ellipse at 0% 50%, var(--color-ajk-100) 0%, transparent 60%),
    linear-gradient(120deg, var(--color-ajk-50) 0%, #fff 100%);
}
.home-services__layout {
  display: grid;
  gap: 2rem;
}
.home-services__intro {
  min-width: 0;
  max-width: 43rem;
}
.home-services__eyebrow {
  color: var(--color-ajk-700);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.home-services__heading {
  margin-top: 0.75rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.home-services__description {
  max-width: 36rem;
  margin-top: 1.25rem;
  color: var(--ui-text);
  font-size: 1rem;
  line-height: 1.8;
}
.home-services__catalog {
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  margin-top: 1.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--color-ajk-700);
  color: #fff;
  font-size: 1rem;
}
.home-services__catalog:hover {
  background: var(--color-ajk-800);
}
.home-services__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  align-items: stretch;
  gap: 1.25rem;
  min-width: 0;
}
.home-services__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--color-ajk-100);
  border-radius: 1.5rem;
  background: #fff;
  color: var(--ui-text-highlighted);
  text-decoration: none;
  box-shadow: 0 14px 48px -32px rgb(16 78 117 / 30%);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}
.home-services__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  border-radius: calc(1.5rem - 1px) calc(1.5rem - 1px) 0 0;
  object-fit: cover;
}
.home-services__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: clamp(1.5rem, 2.5vw, 2rem);
}
.home-services__category {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-ajk-700);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.home-services__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--color-ajk-100);
  border-radius: 0.875rem;
  background: var(--color-ajk-50);
}
.home-services__title {
  margin-top: 1.25rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.375rem, 2vw, 1.625rem);
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.home-services__text {
  margin-top: 0.875rem;
  color: var(--ui-text-muted);
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.home-services__footer {
  display: grid;
  gap: 1.25rem;
  margin-top: auto;
  padding-top: 1.5rem;
}
.home-services__cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-ajk-100);
  border-radius: 0.75rem;
  background: #fff;
  color: var(--color-ajk-700);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.5;
}
.home-services__catalog:focus-visible,
.home-services__card:focus-visible {
  outline: 3px solid var(--color-ajk-700);
  outline-offset: 4px;
}
.home-services__card:focus-visible .home-services__cta {
  background: var(--color-ajk-50);
}
.home-services__empty {
  padding: 2rem;
  border: 1px dashed var(--color-ajk-200);
  border-radius: 1.5rem;
  background: #fff;
}
@media (hover: hover) and (pointer: fine) {
  .home-services__card:hover {
    transform: translateY(-4px);
    border-color: var(--color-ajk-300);
    box-shadow: 0 20px 48px -28px rgb(16 78 117 / 35%);
  }
  .home-services__card:hover .home-services__cta {
    background: var(--color-ajk-50);
  }
}
@media (min-width: 640px) {
  .home-services__eyebrow {
    font-size: 0.8125rem;
  }
  .home-services__description {
    font-size: 1.125rem;
  }
  .home-services__catalog {
    width: auto;
  }
}
@media (min-width: 1024px) {
  .home-services__layout {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(2rem, 3.5vw, 3.5rem);
    align-items: start;
  }
  .home-services__layout--single {
    align-items: center;
  }
  .home-services__layout--single .home-services__image {
    aspect-ratio: 16 / 7;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home-services__card {
    transition: none;
  }
  .home-services__card:hover {
    transform: none;
  }
}
</style>
