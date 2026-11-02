<script setup lang="ts">
const steps = [
  {
    id: 'find',
    title: 'Encuentra tu producto o servicio',
    image: 'encuentra-tu-solucion',
    alt: 'Catálogo ilustrado en un equipo genérico junto a una lupa'
  },
  {
    id: 'request',
    title: 'Realiza tu pedido o solicitud',
    image: 'registra-tu-solicitud',
    alt: 'Formulario ilustrado con un paquete genérico y un bolígrafo'
  },
  {
    id: 'coordinate',
    title: 'Continuamos contigo por WhatsApp',
    image: 'coordinamos-contigo',
    alt: 'Símbolos de conversación junto a auriculares y un sobre'
  }
]
</script>

<template>
  <section class="home-how" aria-labelledby="home-how">
    <UContainer>
      <p class="home-how__eyebrow">Paso a paso</p>
      <h2 id="home-how" class="home-how__heading">Cómo comprar o solicitar</h2>
      <ol class="home-how__steps" role="list">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          :aria-labelledby="`how-${step.id}-title`"
          class="home-how__card"
        >
          <NuxtImg
            :src="`/images/how-it-works/${step.image}.webp`"
            :srcset="`/images/how-it-works/${step.image}-400.webp 400w, /images/how-it-works/${step.image}.webp 800w`"
            :alt="step.alt"
            width="800"
            height="600"
            sizes="100vw md:33vw"
            loading="lazy"
            decoding="async"
            class="home-how__image"
          />
          <div class="home-how__body">
            <span class="home-how__number" aria-hidden="true">{{ index + 1 }}</span>
            <h3 :id="`how-${step.id}-title`" class="home-how__title">{{ step.title }}</h3>
          </div>
        </li>
      </ol>
    </UContainer>
  </section>
</template>

<style scoped>
.home-how {
  padding-block: clamp(2.5rem, 5vw, 4.5rem);
  background: #fff;
}
.home-how__eyebrow {
  color: var(--color-ajk-700);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.home-how__heading {
  max-width: 43rem;
  margin-top: 0.75rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.home-how__steps {
  display: grid;
  gap: 1.25rem;
  margin-top: 2rem;
  list-style: none;
  padding: 0;
}
.home-how__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--color-ajk-100);
  border-radius: 1.5rem;
  background: #fff;
  box-shadow: 0 14px 48px -32px rgb(16 78 117 / 30%);
}
.home-how__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  border-bottom: 1px solid var(--color-ajk-100);
  border-radius: calc(1.5rem - 1px) calc(1.5rem - 1px) 0 0;
  background: var(--color-ajk-50);
  object-fit: contain;
}
.home-how__body {
  flex: 1;
  min-width: 0;
  padding: clamp(1.25rem, 2.5vw, 2rem);
}
.home-how__number {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-ajk-700);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
}
.home-how__title {
  margin-top: 1rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.125rem, 1.7vw, 1.375rem);
  font-weight: 750;
  line-height: 1.35;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
@media (min-width: 640px) {
  .home-how__eyebrow {
    font-size: 0.8125rem;
  }
}
@media (min-width: 768px) {
  .home-how__steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }
}
</style>
