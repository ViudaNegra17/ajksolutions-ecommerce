<script setup lang="ts">
import { computed } from 'vue'
import { buildWhatsAppUrl } from '#shared/utils/tickets'

const props = defineProps<{ whatsapp?: string | null }>()
const hasWhatsApp = computed(() => Boolean(props.whatsapp?.replace(/\D/g, '')))
const contactUrl = computed(() =>
  hasWhatsApp.value
    ? buildWhatsAppUrl(
        props.whatsapp!,
        'Hola, necesito asesoría sobre productos, licencias digitales o servicios.'
      )
    : '/servicios'
)
</script>

<template>
  <section class="home-contact" aria-labelledby="home-contact">
    <UContainer>
      <div class="home-contact__panel">
        <span class="home-contact__icon" aria-hidden="true">
          <UIcon name="i-lucide-messages-square" class="size-8" />
        </span>
        <p class="home-contact__eyebrow">Hablemos de tu próxima solución</p>
        <h2 id="home-contact" class="home-contact__heading">¿Necesitas ayuda para elegir?</h2>
        <p v-if="hasWhatsApp" class="home-contact__description">
          Cuéntanos qué necesitas. Te orientamos en productos, licencias digitales y servicios para encontrar
          la opción que se ajuste a ti.
        </p>
        <p v-else class="home-contact__description">
          Explora nuestros servicios y encuentra opciones de atención para tus equipos.
        </p>
        <UButton
          :to="contactUrl"
          :target="hasWhatsApp ? '_blank' : undefined"
          :rel="hasWhatsApp ? 'noopener noreferrer' : undefined"
          :label="hasWhatsApp ? 'Escríbenos por WhatsApp' : 'Consultar servicios'"
          :icon="hasWhatsApp ? 'i-lucide-message-circle' : 'i-lucide-arrow-right'"
          :ui="{ label: 'whitespace-normal text-center' }"
          aria-describedby="home-contact-note"
          size="lg"
          class="home-contact__action"
        />
        <p id="home-contact-note" class="home-contact__note">
          {{ hasWhatsApp ? 'Se abrirá WhatsApp.' : 'Consulta las opciones de atención disponibles.' }}
        </p>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
.home-contact {
  padding-block: clamp(2.5rem, 4vw, 4rem);
  background: #fff;
}
.home-contact__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: clamp(1.5rem, 4vw, 3.5rem);
  border: 1px solid var(--color-ajk-800);
  border-radius: 1.5rem;
  background: linear-gradient(135deg, var(--color-ajk-700) 0%, var(--color-ajk-950) 100%);
  color: #fff;
  text-align: center;
  box-shadow: 0 18px 48px -28px rgb(16 78 117 / 40%);
}
.home-contact__icon {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 1.25rem;
  background: rgb(255 255 255 / 12%);
  color: #fff;
}
.home-contact__eyebrow {
  margin-top: 1.5rem;
  color: var(--color-ajk-100);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.6;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.home-contact__heading {
  max-width: 43rem;
  margin-top: 0.875rem;
  color: #fff;
  font-size: clamp(1.875rem, 3.3vw, 2.75rem);
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}
.home-contact__description {
  max-width: 42rem;
  margin-top: 1.25rem;
  color: var(--color-ajk-100);
  font-size: 1rem;
  line-height: 1.8;
}
.home-contact__action {
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 24rem;
  min-width: 0;
  min-height: 3.5rem;
  margin-top: 1.75rem;
  padding: 0.875rem 1.25rem;
  border: 1px solid #fff;
  border-radius: 0.875rem;
  background: #fff;
  color: var(--color-ajk-800);
  font-size: 1rem;
  font-weight: 700;
  white-space: normal;
  text-align: center;
}
.home-contact__action:hover {
  background: var(--color-ajk-50);
}
.home-contact__action:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 5px;
}
.home-contact__note {
  max-width: 32rem;
  margin-top: 1rem;
  color: var(--color-ajk-100);
  font-size: 0.8125rem;
  line-height: 1.6;
}
@media (min-width: 640px) {
  .home-contact__eyebrow {
    font-size: 0.8125rem;
  }
  .home-contact__description {
    font-size: 1.125rem;
  }
  .home-contact__action {
    width: auto;
  }
}
</style>
