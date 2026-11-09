# Fase 9 — Baseline inicial

Fecha de auditoría 2026-11-08, zona America/Guayaquil.

## Alcance de esta entrega

Inicio de la fase 9 solicitado por el usuario. Se registra el estado antes de cambios, se ejecutan controles locales y se verifica por HTTP la producción informada. La certificación integral de los PASS 1–40 continúa abierta hasta reunir sus evidencias.

## Estado congelado antes de editar

| Dato                         | Valor observado                                              |
| ---------------------------- | ------------------------------------------------------------ |
| Commit                       | `5636093f1d9ed4536525f9fffeab51f21e4436ab`                   |
| Commit subject               | Implementacion de UI/UX pagina Publica                       |
| Fecha del commit             | 2026-11-01T22:16:10-05:00                                    |
| Branch                       | `main`                                                       |
| Working tree                 | Limpio, `git status --porcelain=v1` sin salida               |
| Origin                       | `https://github.com/ViudaNegra17/ajksolutions-ecommerce.git` |
| Node instalado               | `v24.15.0`                                                   |
| pnpm instalado               | `11.24.0`                                                    |
| Nuxt instalado               | `4.5.2`                                                      |
| Nitro instalado              | `nitropack 2.13.4`                                           |
| Prisma CLI / Client          | `7.10.0 / 7.10.0`                                            |
| PostgreSQL local activo      | `18.3`                                                       |
| Base local                   | `localhost / ajksolutions_ecommerce / public`                |
| Migraciones en disco         | 14                                                           |
| Migraciones en la base local | 14 finalizadas, sin rollback registrado                      |

Se consultó PostgreSQL con `SHOW server_version` y lectura de `_prisma_migrations`. Las credenciales permanecen fuera de las evidencias. Se conservará el hash del schema y de cada migración para verificar que la auditoría inicial los preserva.

## Producción y CI

La URL histórica `https://ajksolutions-ecommerce.vercel.app` respondió 404 `DEPLOYMENT_NOT_FOUND`. El usuario confirmó la URL vigente durante esta auditoría.

Producción vigente en [AJKSolutionS](https://ajksolutions-ecommerce-neon.vercel.app/).

Las ocho comprobaciones iniciales respondieron HTTP 200 en `/`, `/productos`, `/servicios`, `/admin/login`, `/api/health/live`, `/api/health/ready`, `/robots.txt` y `/sitemap.xml`. Ambos health checks devolvieron `{"status":"ok"}`. Home, catálogo y servicios emitieron canonical con el dominio vigente. El sitemap utiliza ese mismo origen.

Vercel CLI y la API autenticada confirmaron el deployment `dpl_8mPXuEbmgrwviwSp9cRDXrkYA9Td`, target `production`, estado `READY`, región `iad1`, Node `24.x` y framework `nuxtjs`. Su SHA es `5636093f1d9ed4536525f9fffeab51f21e4436ab`, coincidente con HEAD. URL del artefacto `https://ajksolutions-ecommerce-fwjsipa7e-viudanegra17s-projects.vercel.app`. La evidencia filtrada está en [vercel-deployment.json](phase9/vercel-deployment.json). Las variables privadas, versión PostgreSQL de Neon y configuración de pooling continúan pendientes de revisión. Los encabezados `x-vercel-id` identifican solicitudes. Readiness demuestra la comprobación `SELECT 1` implementada en el runtime.

CI del SHA inicial pendiente de verificación. La consulta del conector GitHub devolvió HTTP 404. Este resultado describe la falta de evidencia accesible, sin determinar el estado real del workflow. Existe `.github/workflows/ci.yml`, que ejecuta Prisma, lint, formato, tipos, Vitest, base temporal, E2E, visual y build en Windows con Node 24 y PostgreSQL.

## Entorno local

El archivo local configura PostgreSQL instalado en la máquina. Se detectó presencia de `NUXT_SESSION_PASSWORD`. Los secretos independientes de checkout/handoff y `NUXT_PUBLIC_APP_URL` faltan en ese archivo local. Desarrollo utiliza los fallbacks explícitos de configuración. Las pruebas del artefacto productivo usarán secretos aleatorios independientes inyectados al proceso y el origen público confirmado.

Este inventario local debe distinguirse de la configuración privada de Vercel, todavía pendiente de inspección.

## Evidencias y seguimiento

Los resultados de las comprobaciones se registran en [el informe de QA](phase9-qa-final-report.md) y en `docs/phase9/`. Los logs de herramientas quedan en el directorio ignorado `logs/`.

La auditoría inicial preserva schema, migraciones, contratos y flujos comerciales. El cierre requerirá la matriz completa, CI verde del commit final y smoke posterior al despliegue.
