# Checklist SEO de producción

- [ ] `/`, `/productos`, detalle, categorías, `/servicios` y detalle responden 200 y canonical absoluto HTTPS.
- [ ] Productos DIGITAL permanecen bajo `/productos`; `/licencias/**` redirige 301 y no aparece como ruta legacy en sitemap.
- [ ] Sitemap contiene solo home, listados y entidades activas canónicas; `lastmod` solo usa fechas reales.
- [ ] `robots.txt` permite público, bloquea `/admin`, `/api`, carrito, checkout, confirmación y buy-now, y apunta al sitemap final.
- [ ] Admin, login, carrito, checkout, buy-now y confirmaciones usan `noindex`.
- [ ] Catálogo con search/filter/sort/page/brand/category usa canonical `/productos` y `noindex, follow`.
- [ ] Title y description son únicos y coherentes; Open Graph/Twitter usan contenido e imágenes válidas.
- [ ] JSON-LD de Product, Service y Breadcrumb parsea como JSON y solo publica datos reales.
- [ ] No se inventan ratings, reviews, stock, shipping, warranty, returns ni precios promocionales.
- [ ] Producto, servicio y categoría inexistentes responden status 404 real, no soft-404.
- [ ] No hay URLs admin, API, checkout, filtros, search, success ni legacy en sitemap.
- [ ] Se comprobó consistencia sin trailing slash duplicado y `NUXT_PUBLIC_APP_URL` no termina en `/` internamente.

Automatización: `pnpm test:seo` cubre canonical/noindex/robots/sitemap; `pnpm test:e2e` conserva redirects, 404 y structured data de fases anteriores. Validar también con el dominio real después del deploy.
