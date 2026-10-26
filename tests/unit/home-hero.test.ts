import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, createSSRApp, nextTick, type App } from 'vue'
import { renderToString } from 'vue/server-renderer'
import Hero from '../../app/components/PublicHomeHero.vue'
import Campaigns from '../../app/components/PublicHomeCampaigns.vue'
import type { PublicBanner } from '../../shared/types/public-catalog'

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
// Mock the resolved runtime file; real srcset/IPX is verified in production Chromium.
vi.mock('../../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: ['src', 'alt', 'width', 'height', 'sizes', 'loading', 'fetchpriority'],
      setup: (props) => () => h('img', { ...props })
    })
  }
})

const asset = '/images/hero/ajksolutions-hero-ecosystem.webp'
const banner: PublicBanner = {
  title: 'Selección administrable para tus proyectos',
  subtitle: 'Campaña AJKSolutionS',
  description: 'Contenido configurado desde administración.',
  imageUrl: '/campaign-desktop.png',
  mobileImageUrl: '/campaign-mobile.png',
  ctaLabel: 'Explorar selección',
  ctaUrl: '/productos?featured=true',
  placement: 'HOME_HERO'
}
const mounted: Array<{ app: App; host: HTMLDivElement }> = []
function dom(html: string) {
  return new DOMParser().parseFromString(html, 'text/html')
}
afterEach(() => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
})

describe('Hero institucional con asset definitivo', () => {
  it('renderiza por SSR un solo h1, el copy institucional y sus enlaces reales', async () => {
    const document = dom(await renderToString(createSSRApp(Hero)))
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Para trabajar, crear y conectar.'
    )
    expect([...document.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/productos',
      '/servicios'
    ])
    expect(document.body.textContent).toContain('Equipos, licencias digitales y soporte técnico.')
  })
  it('usa solo la Imagen 4 con dimensiones, sizes y prioridad sin duplicar el logo', async () => {
    const document = dom(await renderToString(createSSRApp(Hero)))
    const image = document.querySelector('img')
    expect(document.querySelectorAll('img')).toHaveLength(1)
    expect(image?.getAttribute('src')).toBe(asset)
    expect(image?.getAttribute('width')).toBe('1448')
    expect(image?.getAttribute('height')).toBe('1086')
    expect(image?.getAttribute('sizes')).toContain('55vw')
    expect(image?.getAttribute('srcset')).toContain('ecosystem-752.webp 752w')
    expect(image?.getAttribute('alt')).toContain('herramientas y soporte técnico de AJKSolutionS')
    expect(document.querySelectorAll('[fetchpriority="high"]')).toHaveLength(1)
    expect(document.querySelector('[src="/ajksolutions-official.png"]')).toBeNull()
  })
  it('reemplaza un asset fallido por el logo sin perder copy ni CTA', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(Hero)
    mounted.push({ app, host })
    app.mount(host)
    expect(host.querySelector('img')?.getAttribute('src')).toBe(asset)
    host.querySelector('img')?.dispatchEvent(new Event('error'))
    await nextTick()
    expect(host.querySelectorAll('img')).toHaveLength(1)
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/ajksolutions-official.png')
    expect(host.querySelectorAll('a')).toHaveLength(2)
  })
})

describe('Compatibilidad administrativa de campañas', () => {
  it('conserva HOME_HERO como campaña separada, con copy, CTA y variante móvil', async () => {
    const document = dom(await renderToString(createSSRApp(Campaigns, { banners: [banner] })))
    expect(document.querySelector('h1')).toBeNull()
    expect(document.querySelector('h2')?.textContent).toBe(banner.title)
    expect(document.body.textContent).toContain(banner.description)
    expect(document.querySelector('a')?.getAttribute('href')).toBe(banner.ctaUrl)
    expect(document.querySelector('a')?.textContent).toBe(banner.ctaLabel)
    expect(document.querySelector('source')?.getAttribute('srcset')).toBe(banner.mobileImageUrl)
    expect(document.querySelector('img')?.getAttribute('loading')).toBe('lazy')
    expect(document.querySelector('[fetchpriority="high"]')).toBeNull()
  })
  it('mantiene primer HOME_HERO y HOME_SECONDARY, sin mutar datos ni incluir PRODUCTS_TOP', async () => {
    const banners: PublicBanner[] = [
      { ...banner, title: 'Secundaria', placement: 'HOME_SECONDARY' },
      banner,
      { ...banner, title: 'Productos', placement: 'PRODUCTS_TOP' },
      { ...banner, title: 'Otro hero' }
    ]
    const original = structuredClone(banners)
    const document = dom(await renderToString(createSSRApp(Campaigns, { banners })))
    expect([...document.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      banner.title,
      'Secundaria'
    ])
    expect(banners).toEqual(original)
  })
  it('no deja una sección vacía si no hay campañas', async () => {
    const document = dom(await renderToString(createSSRApp(Campaigns, { banners: [] })))
    expect(document.querySelector('section')).toBeNull()
  })
  it('mantiene texto y CTA de una campaña sin imagen', async () => {
    const document = dom(
      await renderToString(
        createSSRApp(Campaigns, {
          banners: [{ ...banner, imageUrl: '' }]
        })
      )
    )
    expect(document.querySelector('picture')).toBeNull()
    expect(document.querySelector('h2')?.textContent).toBe(banner.title)
    expect(document.querySelector('a')?.getAttribute('href')).toBe(banner.ctaUrl)
  })
})
