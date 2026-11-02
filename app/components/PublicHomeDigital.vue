<template>
  <section class="home-digital" aria-labelledby="home-digital">
    <UContainer>
      <div class="home-digital__panel">
        <div class="home-digital__intro">
          <div class="home-digital__brand">
            <span class="home-digital__mark" aria-hidden="true">
              <UIcon name="i-lucide-key-round" class="size-6" />
            </span>
            <p class="home-digital__eyebrow">Software para tus proyectos</p>
          </div>
          <h2 id="home-digital" class="home-digital__heading">Licencias digitales</h2>
          <p class="home-digital__description">
            Consulta las soluciones disponibles, realiza tu compra individual y coordina el pago y la entrega
            con nuestro equipo por WhatsApp.
          </p>
          <UButton
            to="/productos?productType=DIGITAL"
            label="Ver licencias digitales"
            size="lg"
            trailing
            icon="i-lucide-arrow-right"
            class="home-digital__action"
          />
        </div>
        <div class="home-digital__guide">
          <h3 class="home-digital__guide-title">Tu solución, paso a paso</h3>
          <ol class="home-digital__steps">
            <li class="home-digital__step">
              <span class="home-digital__icon" aria-hidden="true">
                <UIcon name="i-lucide-search" class="size-5" />
              </span>
              <div>
                <p class="home-digital__step-title">Elige tu solución</p>
                <p class="home-digital__step-text">Consulta las licencias disponibles en el catálogo.</p>
              </div>
            </li>
            <li class="home-digital__step">
              <span class="home-digital__icon" aria-hidden="true">
                <UIcon name="i-lucide-shopping-bag" class="size-5" />
              </span>
              <div>
                <p class="home-digital__step-title">Realiza tu compra individual</p>
                <p class="home-digital__step-text">Selecciona la opción que necesitas.</p>
              </div>
            </li>
            <li class="home-digital__step">
              <span class="home-digital__icon" aria-hidden="true">
                <UIcon name="i-lucide-message-circle" class="size-5" />
              </span>
              <div>
                <p class="home-digital__step-title">Coordina por WhatsApp</p>
                <p class="home-digital__step-text">Continuamos contigo para el pago y la entrega.</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.home-digital {
  padding-block: clamp(2.5rem, 5vw, 4.5rem);
  background: #fff;
}
.home-digital__panel {
  display: grid;
  align-items: center;
  gap: 2rem;
  min-width: 0;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border: 1px solid var(--color-ajk-100);
  border-radius: 1.5rem;
  background:
    radial-gradient(ellipse at 0% 0%, var(--color-ajk-100) 0%, transparent 65%),
    linear-gradient(120deg, var(--color-ajk-50) 0%, #fff 100%);
  box-shadow: 0 14px 48px -32px rgb(16 78 117 / 30%);
}
.home-digital__intro {
  min-width: 0;
  max-width: 36rem;
}
.home-digital__brand {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}
.home-digital__mark,
.home-digital__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid var(--color-ajk-100);
  background: var(--color-ajk-50);
  color: var(--color-ajk-700);
}
.home-digital__mark {
  width: 3rem;
  height: 3rem;
  border-radius: 0.875rem;
  background: #fff;
}
.home-digital__eyebrow {
  color: var(--color-ajk-700);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.home-digital__heading {
  margin-top: 1.25rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.home-digital__description {
  margin-top: 1.25rem;
  color: var(--ui-text);
  font-size: 1rem;
  line-height: 1.8;
}
.home-digital__action {
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  margin-top: 1.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--color-ajk-700);
  color: #fff;
  font-size: 1rem;
}
.home-digital__action:hover {
  background: var(--color-ajk-800);
}
.home-digital__action:focus-visible {
  outline: 3px solid var(--color-ajk-700);
  outline-offset: 4px;
}
.home-digital__guide {
  min-width: 0;
  padding: clamp(1.25rem, 2vw, 2rem);
  border: 1px solid var(--color-ajk-100);
  border-radius: 1.25rem;
  background: #fff;
}
.home-digital__guide-title {
  color: var(--ui-text-highlighted);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.5;
}
.home-digital__steps {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}
.home-digital__step {
  display: flex;
  align-items: start;
  gap: 0.875rem;
  min-width: 0;
}
.home-digital__icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
}
.home-digital__step-title {
  color: var(--ui-text-highlighted);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.home-digital__step-text {
  margin-top: 0.375rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
@media (min-width: 640px) {
  .home-digital__eyebrow {
    font-size: 0.8125rem;
  }
  .home-digital__description {
    font-size: 1.125rem;
  }
  .home-digital__action {
    width: auto;
  }
}
@media (min-width: 1024px) {
  .home-digital__panel {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: clamp(2rem, 3.5vw, 3.5rem);
  }
}
</style>
