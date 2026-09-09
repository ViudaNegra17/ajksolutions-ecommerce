# Implementación — Fase 7.5 UI/UX

Fecha de cierre: 2026-09-08. Última verificación: 2026-09-09. Base auditada: `de5c398`. Alcance ejecutado sin Docker y sobre PostgreSQL local.

## 1. Scope

Se consolidaron branding, interfaz clara, contenido, accesibilidad, responsive, reactividad administrativa y caché pública selectiva. Se preservaron los dominios `PHYSICAL`, `DIGITAL` y `SERVICE`, checkout, reservas, idempotencia, RBAC, auditoría y handoff por WhatsApp. No se inició Fase 8, no se actualizaron dependencias mayores y no se creó ninguna migración.

## 2. Initial audit

La auditoría de partida está en `docs/audit-phase-7-5-ui-ux.md`. Detectó superficies oscuras y cyan fijas, marca provisional, overlays manuales, IDs duplicados en búsqueda, navegación administrativa plana, copias técnicas y ausencia de una política común de caché e invalidación. El repositorio inició limpio y con 12 migraciones.

## 3. Nuxt 4 alignment

Se mantuvo Nuxt 4.5.2 con estructura `app/`, `server/` y `shared/`, SSR y TypeScript estricto. `app.vue` usa `NuxtLayout`, `NuxtPage`, `NuxtRouteAnnouncer` y loading indicator. `nuxt.config.ts` conserva la integración de páginas y declara color claro, almacenamiento Nitro local y metadatos de tema.

## 4. Nuxt UI alignment

Nuxt UI 4.11.0 continúa como sistema base. Modales, slideover, dropdown, alerts, cards, buttons, form fields, inputs, empty states, skeletons y toasts usan sus componentes y semántica. `app/app.config.ts` centraliza paleta y variantes compartidas.

## 5. Branding

El logo oficial fue extraído sin alteración desde el documento aprobado a `public/ajksolutions-official.png` (948 × 581) y se usa en storefront, footer y login. La V1 es exclusivamente clara; no existe selector ni variante oscura de la marca.

## 6. Design System

La paleta AJK usa azul como primario y zinc como neutral. `app/assets/css/main.css` define superficies, texto, bordes, foco, radio, contenedores, navegación, tablas y reducción de movimiento. Los tokens evitan colores ad hoc y mantienen contraste y estados coherentes.

## 7. Public Layout

El layout público dispone skip link, header persistente, contenido principal identificado y footer. Las superficies son claras, el ancho está contenido y la jerarquía funciona desde móvil hacia escritorio.

## 8. Header/Search

El header presenta logo, catálogo, servicios, categorías y carrito. En móvil usa `USlideover`; en escritorio, navegación y categorías desplegables. La búsqueda tiene IDs únicos, debounce abortable, loading/error/empty, listbox accesible, flechas, Enter y Escape.

## 9. Home

La portada adopta un hero comercial, CTAs claros y secciones de categorías, destacados, novedades y servicios. Se retiró el lenguaje de infraestructura y se priorizó la propuesta de valor para clientes. Las tarjetas de categoría aplican una superficie clara cuando no existe imagen; el overlay oscuro y el texto blanco se reservan para categorías con fotografía, evitando el contraste ilegible detectado en escritorio.

## 10. Catalog

El catálogo conserva filtros y orden en URL, paginación y read models existentes. En móvil los filtros viven en un slideover; los filtros activos aparecen como chips removibles y el vacío ofrece recuperación clara.

## 11. Product Card

Las tarjetas unifican imagen, marca, nombre, descripción, precio, impuestos, disponibilidad, promoción y CTA. `PHYSICAL` agrega al carrito; `DIGITAL` compra individualmente; `CONTACT` deriva a consulta. No se presenta stock físico en productos digitales.

## 12. Product Detail

El detalle conserva SEO, breadcrumbs, especificaciones, variantes, galería y relacionados. La galería expone selección accesible; el resumen recalcula precio, SKU y disponibilidad por variante y aplica la acción comercial correcta por tipo.

## 13. Cart

El carrito continúa aceptando solo `PHYSICAL`, persiste de manera versionada y muestra cantidad, total estimado, edición y eliminación. Los feedbacks usan toast y el estado vacío dirige al catálogo.

## 14. Checkout

El checkout físico mantiene preview firmado, disponibilidad server-side, dirección/recogida, impuestos, totales, idempotencia y confirmación. Las etiquetas y ayudas se reescribieron para que precio, entrega y errores sean comprensibles.

## 15. Digital Buy Now

`DIGITAL` usa la ruta individual `/productos/[slug]/comprar`, cantidad uno, sin carrito ni dirección. Reutiliza preview, Order y WhatsApp; pago y entrega manual permanecen coordinados externamente. “Licencias” queda solo como copy/categoría de marketing, nunca como dominio técnico.

## 16. Services

Listado, tarjetas, detalle y formulario dinámico conservan modalidades `FIXED`, `FROM` y `QUOTE`, snapshots y creación de Ticket. Se mejoraron jerarquía, campos, estados, errores y confirmación de solicitud.

## 17. Admin UX

El admin es desktop-first y usable en móvil. La navegación se agrupó por Operación, Catálogo, Contenido y Sistema respetando RBAC; el móvil usa slideover. Headers, tablas, formularios, badges, dashboard, clientes, productos, inventario, pedidos, tickets, banners, promociones y configuración comparten patrones visuales claros.

## 18. Copy Audit

Se eliminaron mensajes de base de datos, enums crudos, implementación y legado digital visibles al cliente. Los errores públicos usan mensajes seguros mediante `uiErrorMessage`; etiquetas administrativas ambiguas se normalizaron y los estados pasan por mapas centralizados.

## 19. Accessibility

Se añadieron skip link, route announcer, foco visible, etiquetas, controles nativos, roles listbox, navegación por teclado y targets táctiles. `UModal` y `USlideover` aportan foco, Escape, aria y bloqueo de scroll. `prefers-reduced-motion` elimina animación no esencial.

## 20. Responsive

Storefront mobile-first y admin desktop-first se verificaron en 320, 375, 390, 768, 1024, 1280 y 1440 px. Tablas administrativas tienen contención horizontal local; ningún viewport probado produce overflow horizontal de documento.

## 21. Reactive Admin

`useAdminRequest` centraliza mutaciones administrativas. Después de un `POST`, `PUT`, `PATCH` o `DELETE` exitoso ejecuta `refreshNuxtData` dentro del contexto Nuxt. Ahora acepta `keys` y `domains`, en valor único o arreglo, combina y elimina duplicados sin mutar los argumentos del consumidor.

El mapa `adminRefreshDomains` relaciona los dominios dashboard, productos, inventario, pedidos, tickets, banners, promociones, configuración, servicios, clientes y catálogo con sus claves `useAsyncData`. Los flujos críticos de producto, inventario, pedidos, tickets, banners, promociones y configuración ya usan invalidación selectiva. Los consumidores aún no migrados conservan el refresh global al no especificar targets; además, `fallbackGlobal` queda activo por defecto como recuperación si falla un refresh selectivo y puede desactivarse explícitamente. Producto también reconcilia el DTO guardado y vuelve a consultar el detalle.

## 22. Cache Strategy

La caché es Nitro-first, local y acotada a 512 entradas. Solo almacena DTOs públicos seleccionados: home, banners, categorías, marcas, settings, servicios, productos y relacionados. TTL: categorías/marcas/settings 300 s, servicios 120 s, productos/banners 30 s y home 60 s. Availability, auth, admin, checkout, Order y Ticket llevan `no-store` y nunca usan caché compartida.

Las claves incluyen recurso más query canónica ordenada y hash SHA-256. Se clonan valores, se deduplican cargas concurrentes y se respetan expiración y límite temporal por programación de contenido.

## 23. Cache Invalidation

El plugin de servidor invalida recursos después de cada mutación administrativa relevante. Producto e inventario invalidan productos/home/relacionados; categorías y marcas invalidan sus colecciones y catálogo; banners/promociones invalidan banners/home/productos; servicios invalidan servicios/home; settings invalida settings/home. Un contador de versión impide que una carga en vuelo repueble datos obsoletos. Si falla el almacenamiento de invalidación, la lectura falla de forma cerrada en lugar de servir contenido potencialmente viejo.

## 24. Visual Regression

`tests/e2e/visual-phase7-5.spec.ts` mantiene 19 referencias Chromium: ocho pantallas públicas a 390 y 1440 px, más dashboard, productos y configuración administrativos a 1440 px. Los fixtures crean productos SSR temporales, ejercitan carrito/checkout y se eliminan junto con stock y auditoría. Tras retirar la clase residual `dark:bg-gray-900/80` y corregir el contraste condicional de categorías en la portada, se regeneraron únicamente los baselines `home-390` y `home-1440`; las otras 17 referencias no cambiaron. La comparación dispone de 15 segundos para obtener dos capturas estables sin aumentar `maxDiffPixelRatio`.

## 25. Tests

La cobertura específica incluye once unit tests de tokens, marca, políticas de caché, invalidación y seguridad. Los dos casos nuevos comprueban composición/deduplicación de keys y dominios, y la ausencia de targets que activa el fallback global. Se mantienen seis E2E de caché, no-F5, foco, teclado y responsive, además de diecinueve escenarios visuales. Las suites históricas siguen siendo la regresión de PHYSICAL, DIGITAL, servicios, promociones, SEO y ausencia del dominio legado.

## 26. Gates

El pase de mantenimiento repite ESLint, escritura y verificación Prettier, Nuxt typecheck, Vitest completo, Playwright completo, regresión visual aislada y build de producción. Las aserciones E2E de hidratación administrativa usan 30 segundos para tolerar la compilación en frío de Nuxt sin ocultar errores funcionales. La limpieza E2E de servicios pasa por la API antes del borrado definitivo para invalidar la caché pública y aislar los archivos de prueba. Los números exactos se registran al final de este documento.

## 27. Regressions

No cambió el schema comercial ni las 12 migraciones. Se preservaron restricciones de catálogo, reservas físicas, checkout firmado, idempotencia, estados de Order/Ticket, Buy Now digital, formularios dinámicos, promociones informativas, SEO y RBAC. Los datos visuales temporales se limpian aun al finalizar el suite.

## 28. Technical Debt

- Redis o caché distribuida queda fuera de V1; si se escala a múltiples procesos deberá sustituirse el almacenamiento local manteniendo claves e invalidación.
- Adjuntos públicos continúan pendientes de almacenamiento externo estable según TD-015.
- Las advertencias de iconos Nuxt en compilación son fallback de carga en runtime, no fallos funcionales.

## 29. Status

**FASE 7.5 — CERRADA DEFINITIVAMENTE.** Branding, UI, UX, copy, caché, invalidación, admin reactivo, responsive, accesibilidad y regresión visual quedaron congelados para V1. No se inició Fase 8.

### Resultado del pase final

- Vitest: 111/111.
- Playwright: 56/56.
- Visual: 19/19.
- Prisma format/validate/generate/migrate status: PASS.
- ESLint: PASS.
- Prettier: PASS.
- Typecheck: PASS.
- Build: PASS.
- Migraciones: 12/12 originales; 0 nuevas.
