# Auditoría inicial — Fase 7.5

Fecha: 2026-09-07. Base: `de5c398`. Árbol limpio al inicio; 12 migraciones.

Fuentes: planificación Word y requisitos adjuntos de Fase 7.5.
El logo oficial se encuentra en `word/media/image1.png` del Word. Se extrajo
sin transformar a `public/ajksolutions-official.png` (948 × 581).

| Área                                | Decisión                  | Hallazgo y acción                                                                |
| ----------------------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| Nuxt 4.5.2 / UI 4.11.0 / Vue 3.5.40 | Mantener                  | SSR, estructura app/server/shared y TypeScript estricto.                         |
| Prisma 7.10.0 y dominio             | Mantener                  | Preservar 12 migraciones, precios, reservas, idempotencia, RBAC y handoff.       |
| Tokens, App y layouts               | Rediseñar                 | Clases oscuras y cyan fijados; migrar a superficies claras y azul AJK accesible. |
| Marca                               | Reemplazar                | SVG Nuxt UI y letra A provisionales; usar imagen oficial del Word.               |
| Header/filtros/diálogos             | Reemplazar por Nuxt UI    | Overlays manuales sin gestión completa de foco, Escape y scroll lock.            |
| SearchBox                           | Refactorizar              | ID repetido entre instancias; falta navegación por teclado.                      |
| Home y cards                        | Rediseñar                 | Estética SaaS y textos de infraestructura o del antiguo flujo digital.           |
| Catálogo y detalle                  | Refactorizar              | Mantener filtros URL, read models y SEO; mejorar filtros activos y jerarquía.    |
| Compra y servicios                  | Refactorizar              | Preservar Pinia y backend; mejorar claridad, errores y formularios.              |
| Admin                               | Refactorizar              | Navegación plana; refresh local frecuente pero sin dependencias entre pantallas. |
| Caché                               | Incorporar selectivamente | Sin política común ni invalidación; settings públicos actualmente no-store.      |
| Pruebas                             | Ampliar                   | Mantener regresiones y añadir no-F5, caché, foco, responsive y snapshots.        |

## Orden de trabajo

Identidad/tokens → navegación → storefront → admin/copy → reactividad → caché →
accesibilidad/responsive → regresiones visuales → gates/documentación.
Se valida cada bloque. Esta auditoría no acredita la finalización de la fase.

## Límites

Sin nuevas migraciones, cambios al núcleo comercial ni upgrades. PostgreSQL local,
sin Docker. Caché local Nitro; infraestructura distribuida fuera de alcance.
No iniciar Fase 8.
