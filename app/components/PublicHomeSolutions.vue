<script setup lang="ts">
const solutions = [
  {
    id: 'products',
    title: 'Productos',
    text: 'Equipos, componentes y accesorios para trabajar, estudiar y crear.',
    cta: 'Ver productos',
    to: '/productos',
    icon: 'i-lucide-monitor',
    number: ''
  },
  {
    id: 'digital',
    title: 'Licencias digitales',
    text: 'Software y soluciones digitales. Coordinamos contigo el pago y la entrega por WhatsApp.',
    cta: 'Ver licencias digitales',
    to: '/productos?productType=DIGITAL',
    icon: 'i-lucide-key-round',
    number: ''
  },
  {
    id: 'services',
    title: 'Servicios tecnológicos',
    text: 'Soporte, reparación y soluciones especializadas para tus equipos.',
    cta: 'Ver servicios',
    to: '/servicios',
    icon: 'i-lucide-wrench',
    number: ''
  }
]
</script>

<template>
  <section class="home-solutions" aria-labelledby="home-solutions">
    <UContainer>
      <div class="home-solutions__intro">
        <p class="home-solutions__eyebrow">Elige tu camino</p>
        <h2 id="home-solutions" class="home-solutions__heading">Soluciones AJKSolutionS</h2>
        <p class="home-solutions__description">
          Encuentra lo que necesitas para tus equipos, tus proyectos y tu día a día.
        </p>
      </div>
      <div class="home-solutions__grid">
        <NuxtLink
          v-for="solution in solutions"
          :key="solution.id"
          :to="solution.to"
          :aria-labelledby="`solution-${solution.id}-title solution-${solution.id}-cta`"
          :aria-describedby="`solution-${solution.id}-description`"
          class="home-solutions__card"
        >
          <div class="home-solutions__card-top" aria-hidden="true">
            <span class="home-solutions__icon">
              <UIcon :name="solution.icon" class="size-7" />
            </span>
            <span class="home-solutions__number">{{ solution.number }}</span>
          </div>
          <h3 :id="`solution-${solution.id}-title`" class="home-solutions__title">
            {{ solution.title }}
          </h3>
          <p :id="`solution-${solution.id}-description`" class="home-solutions__text">
            {{ solution.text }}
          </p>
          <span :id="`solution-${solution.id}-cta`" class="home-solutions__cta">
            {{ solution.cta }}
            <UIcon name="i-lucide-arrow-right" class="size-5 shrink-0" aria-hidden="true" />
          </span>
        </NuxtLink>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.home-solutions {
  padding-block: clamp(2.5rem, 5vw, 4.5rem);
  background: linear-gradient(180deg, #fff 0%, var(--color-ajk-50) 100%);
}
.home-solutions__intro {
  max-width: 43rem;
}
.home-solutions__eyebrow {
  color: var(--color-ajk-700);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.home-solutions__heading {
  margin-top: 0.75rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.home-solutions__description {
  margin-top: 1rem;
  color: var(--ui-text);
  font-size: 1rem;
  line-height: 1.8;
}
.home-solutions__grid {
  display: grid;
  gap: 1.25rem;
  margin-top: 2rem;
}
.home-solutions__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(1.5rem, 2.5vw, 2rem);
  border: 1px solid var(--color-ajk-100);
  border-radius: 1.5rem;
  background: radial-gradient(ellipse at 100% 0%, var(--color-ajk-100) 0%, transparent 65%), #fff;
  color: var(--ui-text-highlighted);
  text-decoration: none;
  box-shadow: 0 14px 48px -32px rgb(16 78 117 / 30%);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}
.home-solutions__card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.home-solutions__icon {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border: 1px solid var(--color-ajk-100);
  border-radius: 1rem;
  background: var(--color-ajk-50);
  color: var(--color-ajk-700);
}
.home-solutions__number {
  color: var(--color-ajk-700);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.home-solutions__title {
  margin-top: 1.5rem;
  font-size: clamp(1.375rem, 2vw, 1.625rem);
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.home-solutions__text {
  flex: 1;
  margin-top: 0.875rem;
  color: var(--ui-text-muted);
  line-height: 1.8;
}
.home-solutions__cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 3rem;
  margin-top: 1.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-ajk-100);
  border-radius: 0.75rem;
  background: #fff;
  color: var(--color-ajk-700);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.5;
}
.home-solutions__card:focus-visible {
  outline: 3px solid var(--color-ajk-700);
  outline-offset: 4px;
}
.home-solutions__card:focus-visible .home-solutions__cta {
  background: var(--color-ajk-50);
}
@media (hover: hover) and (pointer: fine) {
  .home-solutions__card:hover {
    transform: translateY(-4px);
    border-color: var(--color-ajk-300);
    box-shadow: 0 20px 48px -28px rgb(16 78 117 / 35%);
  }
  .home-solutions__card:hover .home-solutions__cta {
    background: var(--color-ajk-50);
  }
}
@media (min-width: 640px) {
  .home-solutions__eyebrow {
    font-size: 0.8125rem;
  }
  .home-solutions__description {
    font-size: 1.125rem;
  }
}
@media (min-width: 1024px) {
  .home-solutions__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home-solutions__card {
    transition: none;
  }
  .home-solutions__card:hover {
    transform: none;
  }
}
</style>
