<script setup lang="ts">
const support = [
  {
    id: 'advisory',
    title: 'Asesoría especializada',
    text: 'Consulta qué solución se ajusta a lo que necesitas.',
    image: 'asesoria-especializada',
    alt: 'Equipo genérico con símbolos de conversación y una lista de opciones'
  },
  {
    id: 'warranty',
    title: 'Garantía informada',
    text: 'Revisa la garantía indicada para cada producto o servicio.',
    image: 'garantia-informada',
    alt: 'Documento de condiciones junto a una lupa y un escudo'
  },
  {
    id: 'technical',
    title: 'Soporte técnico',
    text: 'Solicita diagnóstico, mantenimiento o reparación de tus equipos.',
    image: 'soporte-tecnico',
    alt: 'Circuito electrónico genérico y herramientas de precisión'
  },
  {
    id: 'contact',
    title: 'Atención directa',
    text: 'Continuamos contigo por WhatsApp para coordinar tu solicitud.',
    image: 'atencion-directa',
    alt: 'Auriculares y dispositivo genérico con símbolos de conversación'
  }
]
</script>

<template>
  <section class="home-backing" aria-labelledby="home-support">
    <UContainer>
      <div class="home-backing__intro">
        <p class="home-backing__eyebrow">Contigo en cada paso</p>
        <h2 id="home-support" class="home-backing__heading">Respaldo AJKSolutionS</h2>
      </div>
      <div class="home-backing__grid">
        <article
          v-for="item in support"
          :key="item.id"
          :aria-labelledby="`backing-${item.id}-title`"
          class="home-backing__card"
        >
          <NuxtImg
            :src="`/images/backing/${item.image}.webp`"
            :srcset="`/images/backing/${item.image}-400.webp 400w, /images/backing/${item.image}.webp 800w`"
            :alt="item.alt"
            width="800"
            height="600"
            sizes="100vw sm:50vw lg:25vw"
            loading="lazy"
            decoding="async"
            class="home-backing__image"
          />
          <div class="home-backing__body">
            <h3 :id="`backing-${item.id}-title`" class="home-backing__title">{{ item.title }}</h3>
            <p class="home-backing__text">{{ item.text }}</p>
          </div>
        </article>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.home-backing {
  padding-block: clamp(2.5rem, 5vw, 4.5rem);
  border-block: 1px solid var(--color-ajk-100);
  background: linear-gradient(180deg, #fff 0%, var(--color-ajk-50) 100%);
}
.home-backing__intro {
  max-width: 43rem;
}
.home-backing__eyebrow {
  color: var(--color-ajk-700);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.home-backing__heading {
  margin-top: 0.75rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.home-backing__grid {
  display: grid;
  gap: 1.25rem;
  margin-top: 2rem;
}
.home-backing__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--color-ajk-100);
  border-radius: 1.5rem;
  background: #fff;
  box-shadow: 0 14px 48px -32px rgb(16 78 117 / 30%);
}
.home-backing__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  border-bottom: 1px solid var(--color-ajk-100);
  border-radius: calc(1.5rem - 1px) calc(1.5rem - 1px) 0 0;
  background: var(--color-ajk-50);
  object-fit: contain;
}
.home-backing__body {
  flex: 1;
  min-width: 0;
  padding: 1.5rem;
}
.home-backing__title {
  color: var(--ui-text-highlighted);
  font-size: 1.25rem;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.home-backing__text {
  margin-top: 0.875rem;
  color: var(--ui-text-muted);
  line-height: 1.8;
}
@media (min-width: 640px) {
  .home-backing__eyebrow {
    font-size: 0.8125rem;
  }
  .home-backing__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .home-backing__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem;
  }
}
</style>
