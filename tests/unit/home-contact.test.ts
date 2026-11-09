import { describe, expect, it, vi } from 'vitest'
import { createApp, createSSRApp, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import Contact from '../../app/components/PublicHomeContact.vue'

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
      props: ['to', 'label', 'target', 'rel', 'ui', 'icon', 'size'],
      setup: (props) => () => h('a', { href: props.to, target: props.target, rel: props.rel }, props.label)
    })
  }
})
vi.mock('@nuxt/ui/components/Icon.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ setup: () => () => h('span', { 'aria-hidden': 'true' }) }) }
})

describe('Contacto de Inicio', () => {
  it('ofrece el WhatsApp configurado con mensaje preparado y aviso de apertura por SSR', async () => {
    const document = new DOMParser().parseFromString(
      await renderToString(createSSRApp(Contact, { whatsapp: '+593 99 123 4567' })),
      'text/html'
    )
    const link = document.querySelector('a')!
    const url = new URL(link.href)
    expect(url.origin).toBe('https://wa.me')
    expect(url.pathname).toBe('/593991234567')
    expect(url.searchParams.get('text')).toBe(
      'Hola, necesito asesoría sobre productos, licencias digitales o servicios.'
    )
    expect(link.textContent).toBe('Escríbenos por WhatsApp')
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
    expect(link.rel).toContain('noreferrer')
    expect(document.getElementById(link.getAttribute('aria-describedby')!)?.textContent).toContain(
      'Se abrirá WhatsApp.'
    )
    expect(document.querySelectorAll('a')).toHaveLength(1)
  })
  it('conserva un destino interno útil cuando falta un número utilizable', async () => {
    for (const whatsapp of [undefined, null, '', ' ()--- ']) {
      const document = new DOMParser().parseFromString(
        await renderToString(createSSRApp(Contact, { whatsapp })),
        'text/html'
      )
      const link = document.querySelector('a')!
      expect(link.getAttribute('href')).toBe('/servicios')
      expect(link.textContent).toBe('Consultar servicios')
      expect(link.getAttribute('target')).toBeNull()
      expect(document.body.textContent).not.toContain('Escríbenos por WhatsApp')
    }
  })
  it('actualiza el destino y la alternativa si cambia la configuración recibida', async () => {
    const whatsapp = ref<string | null>('+593991234567')
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({ render: () => h(Contact, { whatsapp: whatsapp.value }) })
    try {
      app.mount(host)
      expect(new URL(host.querySelector('a')!.href).pathname).toBe('/593991234567')
      whatsapp.value = null
      await nextTick()
      expect(host.querySelector('a')?.getAttribute('href')).toBe('/servicios')
      whatsapp.value = '+593987654321'
      await nextTick()
      expect(new URL(host.querySelector('a')!.href).pathname).toBe('/593987654321')
    } finally {
      app.unmount()
      host.remove()
    }
  })
})
