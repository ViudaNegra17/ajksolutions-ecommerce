# Implementación de Fase 3 — Portal público y catálogo

**Fecha:** 30 de agosto de 2026  
**Estado:** implementada y verificada  
**Base de datos:** PostgreSQL local, sin Docker

## 1. Implementado

Se implementó el portal público SSR sobre la arquitectura existente:

    Nuxt → API pública → Service → Repository → Prisma → PostgreSQL

La entrega incluye Home, catálogo paginado, categorías jerárquicas, búsqueda y autocompletado remoto, filtros persistidos en URL, detalle de producto, galería, variantes, disponibilidad, relacionados, settings públicos, SEO, JSON-LD, sitemap y robots. No se incorporaron carrito, checkout, pedidos, pagos ni módulos de Fase 4.

La fase reutiliza íntegramente el modelo de datos de Fase 2.1. No fue necesaria una migración nueva; las tres migraciones existentes permanecen aplicadas y el schema está actualizado.

## 2. Archivos creados

Backend y contratos:

- `shared/schemas/public-catalog.schema.ts`
- `shared/types/public-catalog.ts`
- `shared/utils/public-catalog.ts`
- `server/repositories/public-catalog.repository.ts`
- `server/services/public-catalog.service.ts`
- `server/utils/public-route.ts`
- endpoints públicos bajo `server/api/products`, `categories`, `brands`, `search`, `settings` y `home`
- `server/routes/sitemap.xml.get.ts`
- `server/routes/robots.txt.get.ts`

Frontend:

- 14 componentes reutilizables bajo `app/components/public`
- `app/pages/index.vue`
- `app/pages/productos/index.vue`
- `app/pages/productos/[slug].vue`
- `app/pages/categoria/[slug].vue`

Pruebas:

- `tests/unit/public-catalog-phase3.test.ts`
- `tests/integration/public-catalog-phase3.test.ts`
- `tests/e2e/public-catalog-phase3.spec.ts`

Decisión arquitectónica:

- `docs/adr/ADR-001-public-catalog-read-model.md`

## 3. Archivos modificados

- `app/layouts/default.vue`: layout público con header, footer y señal verificable de hidratación.
- `app/assets/css/main.css`: estilos responsive y componentes del portal.
- `README.md`: alcance, estructura y enlaces de Fase 3.
- `docs/technical-decisions.md`: TD-010.

No se modificó `prisma/schema.prisma` ni se creó migración.

## 4. APIs públicas

| Método | Ruta                               | Responsabilidad                                   |
| ------ | ---------------------------------- | ------------------------------------------------- |
| GET    | `/api/home`                        | categorías, destacados, nuevos, marcas y settings |
| GET    | `/api/products`                    | catálogo, filtros, orden y paginación             |
| GET    | `/api/products/:slug`              | detalle público                                   |
| GET    | `/api/products/:slug/availability` | disponibilidad general o por variante             |
| GET    | `/api/products/:slug/related`      | productos relacionados                            |
| GET    | `/api/categories`                  | árbol público de categorías                       |
| GET    | `/api/categories/:slug`            | categoría y descendientes                         |
| GET    | `/api/brands`                      | marcas públicas con productos visibles            |
| GET    | `/api/search?q=...`                | sugerencias remotas                               |
| GET    | `/api/settings/public`             | lista blanca de configuración                     |
| GET    | `/sitemap.xml`                     | URLs públicas visibles                            |
| GET    | `/robots.txt`                      | reglas de rastreo                                 |

Los parámetros se validan con Zod. `pageSize` tiene valor por defecto 24 y máximo 60; búsqueda/autocomplete limita longitud y cantidad de resultados. Slugs inválidos producen 422 y recursos no visibles producen 404.

## 5. UI pública

El layout público incorpora navegación principal, buscador con debounce de 320 ms y cancelación de solicitudes, árbol de categorías y footer. Home consume datos reales mediante SSR y presenta hero, categorías, destacados, novedades y marcas.

El diseño es mobile first. En escritorio los filtros permanecen laterales; en móvil se abren como panel superpuesto. Se usaron landmarks, labels, navegación por teclado, estados vacíos y textos accesibles.

Las páginas de servicios y licencias siguen siendo destinos informativos de navegación; sus flujos comerciales pertenecen a fases posteriores.

## 6. Catálogo

Las rutas `/productos` y `/categoria/:slug` se alimentan exclusivamente de APIs públicas. Soportan:

- búsqueda textual;
- categoría y descendientes válidos;
- marca;
- modo de precio;
- disponibilidad;
- destacados;
- rango de precio;
- atributos dinámicos;
- orden por relevancia/novedad, nombre y precio;
- paginación de servidor.

El estado se serializa en query params, por lo que la URL es compartible y conserva filtros. Los filtros de atributos consultan relaciones normalizadas tanto del producto como de variantes activas.

La consulta paginada usa selects explícitos y obtiene cada bloque en consultas acotadas; no realiza consultas por tarjeta ni presenta N+1.

## 7. Precio

`FIXED` se calcula con `Prisma.Decimal`, respeta precio de variante, configuración fiscal y moneda. La API serializa importes como strings decimales para no perder precisión. La UI formatea con `Intl.NumberFormat`.

`CONTACT` devuelve `amount: null`, muestra “Consultar precio” y nunca representa cero. Al ordenar por precio, los productos CONTACT quedan después de los precios numéricos tanto ascendente como descendentemente.

## 8. Variantes

El detalle agrupa opciones por atributo de variante. Sólo se habilitan combinaciones activas existentes. La primera combinación activa se selecciona automáticamente y esta decisión queda explícita en TD-010.

Al cambiar variante se actualizan SKU, precio efectivo y disponibilidad. Las variantes inactivas, eliminadas o que no pertenecen al producto no se publican ni se aceptan en la consulta de disponibilidad.

## 9. Disponibilidad

La respuesta pública distingue:

- `IN_STOCK`: stock físico disponible;
- `SUPPLIER`: disponible bajo pedido mediante relación activa;
- `OUT_OF_STOCK`: sin disponibilidad;
- `CONTACT`: producto de consulta comercial.

El stock propio usa `quantityOnHand - quantityReserved`. La disponibilidad de proveedor nunca se suma al inventario físico. Se exponen señales comerciales y plazo estimado, pero no costo, proveedor, cantidades internas ni relaciones eliminadas.

El endpoint de disponibilidad envía `Cache-Control: no-store` porque es información volátil. El resto no incorpora todavía una capa de caché; se evita así una estrategia de invalidación prematura.

## 10. SEO

Home, catálogo, categoría y detalle generan metadata SSR, descripción y canonical. El producto usa `metaTitle` y `metaDescription` cuando existen, con fallback legible.

El detalle incorpora JSON-LD `Product` sólo con `Offer` cuando el precio es FIXED, además de `BreadcrumbList`. Categorías incluyen breadcrumbs estructurados. Los valores JSON-LD se serializan escapando `<` para impedir cierre/inyección de scripts.

`sitemap.xml` incluye Home, catálogo, categorías y productos visibles. Excluye eliminados, inactivos, admin y API. `robots.txt` bloquea `/admin` y `/api` y anuncia el sitemap.

## 11. Seguridad

La frontera pública utiliza DTOs propios y selects mínimos. Nunca expone:

- costos o nombres de proveedores;
- movimientos o ubicaciones de inventario;
- cantidades reservadas;
- auditoría, usuarios o permisos;
- campos de soft delete;
- settings privados.

La visibilidad exige producto activo/no eliminado y una categoría activa/no eliminada cuyo árbol de ancestros también sea válido. Imágenes, marcas, variantes y proveedores se filtran igualmente por estado. Todo SQL dinámico usa Prisma y parámetros; no se concatenan valores del usuario.

## 12. Performance

- SSR para contenido indexable y primera carga.
- Paginación real con máximo 60 registros.
- Selects explícitos y consultas en bloque.
- Debounce y `AbortController` en autocomplete.
- Carga de imágenes mediante `NuxtImg` con lazy loading fuera del recurso principal.
- Relacionados limitados y calculados en una sola consulta.
- Disponibilidad consultable por variante sin descargar información administrativa.

No se agregó índice de búsqueda ni caché al no existir evidencia de volumen que lo justifique. Son opciones para medición futura.

## 13. Tests

Resultados finales:

    Vitest
      archivos                         6/6
      pruebas                        38/38
      nuevas de Fase 3               12/12

    Playwright
      escenarios totales             10/10
      nuevos de Fase 3                4/4

Las unitarias cubren formato monetario, Decimal, límites, filtros dinámicos, disponibilidad, schema.org, FIXED/CONTACT y serialización segura. Las de integración usan PostgreSQL real para visibilidad, orden de precios, atributos, disponibilidad y detalle. Las E2E verifican API, Home, URL de filtros, búsqueda, variantes, CONTACT, SEO, sitemap y robots.

La suite E2E se ejecutó en serie para mantener aislamiento determinista entre fixtures PostgreSQL. El layout expone una señal de hidratación que evita interactuar con HTML SSR antes de montar Vue.

## 14. Build

Puertas ejecutadas:

    prisma validate             correcto
    db:deploy                   correcto; sin migraciones pendientes
    db:seed                     correcto e idempotente
    prisma migrate status       Database schema is up to date
    lint                        correcto
    format:check                correcto
    typecheck                   correcto
    test                        38/38
    test:e2e                    10/10
    build                       correcto

El artefacto Node/Nitro se generó en `.output`. El build emite advertencias de resolución de iconos y export mappings de dependencias; no afectan el resultado ni corresponden a errores del código de Fase 3.

## 15. Problemas

Durante la validación, las pruebas intentaban interactuar apenas aparecía el HTML SSR, antes de terminar la hidratación bajo la carga de compilación inicial de Vite. Se añadió un estado explícito `data-hydrated` al layout y las pruebas esperan esa condición.

No quedaron errores funcionales conocidos. No hubo cambios destructivos ni pérdida de datos.

## 16. Deuda técnica

- Medir consultas y Core Web Vitals con un volumen de catálogo representativo antes de agregar caché o un índice de búsqueda.
- Revisar la advertencia de concurrencia de `pg` antes de pg 9, heredada de las pruebas de integración.
- Resolver canales de contacto reales y contenido definitivo de servicios/licencias en la fase correspondiente.
- Revisar warnings de dependencias Nuxt/Icon al actualizar versiones.
- Incorporar imágenes definitivas/R2 cuando exista el flujo de archivos autorizado.

## 17. Estado

    FASE 3
    CERRADA

Los criterios de aceptación de Home, catálogo, detalle, SEO, seguridad, performance y validaciones finales están cubiertos. El portal opera con datos reales de PostgreSQL local y sin Docker.

## 18. Próximo paso

# FASE 4 — SERVICIOS Y TICKETS

La siguiente iteración debe desarrollar exclusivamente el alcance de servicios y tickets según su especificación. No se inició automáticamente carrito, checkout, pedidos, pagos ni ninguna fase posterior.

## Actualización posterior — Fase 8.5

Home ya no consulta/renderiza categorías, marcas, destacados y novedades redundantes. El read model
actual contiene settings, banners y hasta tres servicios; conserva cache y SEO. Los detalles mejoran
lectura sin modificar flujos de compra. Consulte [la implementación 8.5](implementation-phase-8-5-final-review.md).
