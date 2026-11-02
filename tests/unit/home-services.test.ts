import { describe, expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import Services from '../../app/components/PublicHomeServices.vue'
import type { PublicServiceCard } from '../../shared/types/services'

vi.mock('@nuxt/ui/components/Container.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      setup(_, { slots }) {
        return () => h('div', slots.default?.())
      }
    })
  }
})
vi.mock('@nuxt/ui/components/Button.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: ['to', 'label'],
      setup: (props) => () => h('a', { href: props.to }, props.label)
    })
  }
})
vi.mock('@nuxt/ui/components/Icon.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ setup: () => () => h('span', { 'aria-hidden': 'true' }) }) }
})
vi.mock('../../node_modules/nuxt/dist/app/components/nuxt-link', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: ['to'],
      setup(props, { slots }) {
        return () => h('a', { href: props.to }, slots.default?.())
      }
    })
  }
})
vi.mock('../../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: ['src', 'alt', 'width', 'height', 'loading'],
      setup: (props) => () => h('img', { ...props })
    })
  }
})
const service: PublicServiceCard = {
  code: 'SRV-001',
  name: 'Diagnóstico Técnico',
  slug: 'diagnostico',
  shortDescription: 'Evaluación inicial de tu equipo.',
  image: '/diagnostico.webp',
  category: { name: 'Soporte técnico', slug: 'soporte' },
  price: { mode: 'QUOTE', amount: null, currency: 'USD', includesTax: true },
  modalities: [],
  estimatedDuration: null,
  featured: true
}
async function render(services: PublicServiceCard[]) {
  return new DOMParser().parseFromString(
    await renderToString(createSSRApp(Services, { services })),
    'text/html'
  )
}
describe('Soporte de Inicio con datos públicos', () => {
  it('mantiene el acceso al catálogo sin inventar servicios cuando está vacío', async () => {
    const document = await render([])
    expect(document.querySelector('h2')?.textContent).toBe('¿Tu equipo necesita atención?')
    expect(document.querySelectorAll('h3')).toHaveLength(0)
    expect(document.querySelector('a')?.getAttribute('href')).toBe('/servicios')
    expect(document.body.textContent).toContain('Los servicios publicados se mostrarán aquí.')
  })
  it('muestra un servicio real con cotización, imagen diferida y un único enlace accesible', async () => {
    const document = await render([service])
    const card = document.querySelector('a[href="/servicios/diagnostico"]')!
    expect(card.textContent).toContain(service.name)
    expect(card.textContent).toContain('Solicitar cotización')
    expect(card.querySelector('img')?.getAttribute('loading')).toBe('lazy')
    expect(card.querySelector('a, button')).toBeNull()
    for (const id of card.getAttribute('aria-labelledby')!.split(' ')) {
      expect(document.getElementById(id)?.textContent?.trim()).toBeTruthy()
    }
  })
  it('conserva varios servicios y sus modos de precio sin mutar los datos', async () => {
    const services: PublicServiceCard[] = [
      service,
      {
        ...service,
        slug: 'mantenimiento',
        name: 'Mantenimiento',
        image: null,
        price: { ...service.price, mode: 'FIXED', amount: '15.00' }
      },
      {
        ...service,
        slug: 'reparacion',
        name: 'Reparación',
        shortDescription: null,
        price: { ...service.price, mode: 'FROM', amount: '30.00' }
      }
    ]
    const original = structuredClone(services)
    const document = await render(services)
    expect([...document.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual(
      services.map((s) => s.name)
    )
    expect(document.querySelectorAll('a[href^="/servicios/"]')).toHaveLength(3)
    expect(document.querySelector('a[href="/servicios/mantenimiento"]')?.textContent).toContain('15')
    expect(document.querySelector('a[href="/servicios/reparacion"]')?.textContent).toContain('Desde')
    expect(services).toEqual(original)
  })
})
