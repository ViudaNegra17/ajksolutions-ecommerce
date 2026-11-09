import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, createSSRApp, h, nextTick, ref, type App } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ServiceImage from '../../app/components/public/ServiceImage.vue'

vi.mock('../../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: ['src', 'alt', 'width', 'height', 'sizes', 'loading'],
      setup: (props) => () => h('img', { ...props })
    })
  }
})
vi.mock('@nuxt/ui/components/Icon.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ setup: () => () => h('span', { 'aria-hidden': 'true' }) }) }
})

let app: App | undefined
let host: HTMLDivElement | undefined
afterEach(() => {
  app?.unmount()
  host?.remove()
})

describe('Imagen de servicio con fallback estable', () => {
  it('renderiza un fallback accesible por SSR si falta URL', async () => {
    const html = await renderToString(createSSRApp(ServiceImage, { src: null, alt: 'Diagnóstico' }))
    const dom = new DOMParser().parseFromString(html, 'text/html')
    expect(dom.querySelector('img')).toBeNull()
    expect(dom.querySelector('[data-service-image]')?.classList.contains('aspect-video')).toBe(true)
    expect(dom.querySelector('[data-service-image-fallback]')?.getAttribute('role')).toBe('img')
    expect(dom.querySelector('[data-service-image-fallback]')?.getAttribute('aria-label')).toContain(
      'Diagnóstico'
    )
  })

  it('conserva alt, dimensiones y lazy loading de una imagen por SSR', async () => {
    const html = await renderToString(createSSRApp(ServiceImage, { src: '/real.png', alt: 'Diagnóstico' }))
    const dom = new DOMParser().parseFromString(html, 'text/html')
    const image = dom.querySelector('img')!
    expect(image.getAttribute('src')).toBe('/real.png')
    expect(image.getAttribute('alt')).toBe('Diagnóstico')
    expect(image.getAttribute('width')).toBe('640')
    expect(image.getAttribute('height')).toBe('360')
    expect(image.getAttribute('loading')).toBe('lazy')
    expect(dom.querySelector('[data-service-image-fallback]')).toBeNull()
  })

  it('retira la imagen fallida, conserva el contenedor y reintenta al cambiar URL', async () => {
    const src = ref<string | null>('/first.png')
    host = document.createElement('div')
    document.body.append(host)
    app = createApp({ render: () => h(ServiceImage, { src: src.value, alt: 'Diagnóstico' }) })
    app.mount(host)
    const container = host.querySelector('[data-service-image]')!
    const classes = container.className
    host.querySelector('img')!.dispatchEvent(new Event('error'))
    await nextTick()
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-service-image-fallback]')).not.toBeNull()
    expect(host.querySelector('[data-service-image]')).toBe(container)
    expect(container.className).toBe(classes)
    src.value = '/second.png'
    await nextTick()
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/second.png')
    expect(host.querySelector('[data-service-image-fallback]')).toBeNull()
    src.value = null
    await nextTick()
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-service-image-fallback]')).not.toBeNull()
  })
})
