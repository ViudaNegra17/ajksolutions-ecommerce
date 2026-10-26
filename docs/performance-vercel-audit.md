# Auditoría de rendimiento, arranque y Vercel

## 1. HEAD analizado

Commit: `11d54848ea0e4620f947df99acf03bf7c84f051b` (`retorques de carga`). Al iniciar, main local y remoto coincidían y el árbol estaba limpio. Se inspeccionaron código, lockfile, esquema, middleware, plugins, caché, Home y health reales; la documentación histórica no sustituye esta revisión.

Versiones: Node local 24.15.0; CI Node 24; pnpm 11.24.0; Nuxt 4.5.2; Nitro 2.13.4; Vite 8.2.2; Vue 3.5.40; Nuxt UI 4.11.0; Reka UI 2.10.3; Prisma/client/adapter 7.10.0; pg 8.23.0.

## 2. Fecha, alcance y metodología

Fecha: 19 de octubre de 2026, America/Guayaquil. Deployment solicitado: https://ajksolutions-ecommerce-neon.vercel.app/ (no el dominio anterior sin `-neon`).

Se separaron desarrollo, build, preview, ejecución directa del artefacto y Vercel. Tres solicitudes por ruta; HTTP con conexiones nuevas y navegador con contextos nuevos. Un contexto de navegador vacío no implica un servidor frío. Solo se marca como cold verificado la primera ruta de un proceso local recién creado. En Vercel no se conoce la reutilización de instancia.

Los archivos JSON contienen DNS, TCP, TLS, TTFB, descarga, tamaño, estados y cabeceras permitidas; los registros de navegador incluyen DCL, load, marcador de hidratación, LCP, tareas largas y recursos. Duración de DB por petición no instrumentada se registra como null, no cero. La duración del servidor solo se informa cuando existe instrumentación/correlación real.

Los servidores de diagnóstico usaron puertos 3015/3016 y secretos independientes efímeros en el entorno hijo. No se alteraron `.env`, credenciales ni la configuración global de Windows. Se excluyó el control `invalid-direct-cli-*`: invocaba Nuxt sin el shim de pnpm y su NODE_PATH, produciendo un error artificial de resolución. Los controles válidos usan los comandos reales de pnpm.

## 3. Error exacto de Vercel

Respuesta observada:

```text
A server error has occurred

FUNCTION_INVOCATION_FAILED

iad1::6wqnr-1792412175935-284fd16f3b2c
```

Este es un fallo genérico de ejecución, no una demostración de timeout, de error PostgreSQL ni de una variable ausente. No se observó públicamente FUNCTION_INVOCATION_TIMEOUT, P1001, P1002, ECONNREFUSED, ETIMEDOUT o error SSL.

## 4. Status HTTP y tiempos remotos

Las 24 solicitudes de la tabla y las seis de detalles devolvieron **500**, cuerpo de 96 bytes. Valores TTFB en ms:

| Ruta              | Primera observada | Segunda | Tercera |
| ----------------- | ----------------: | ------: | ------: |
| /                 |            887.01 |  875.23 |  812.38 |
| /productos        |            841.82 |  833.17 |  828.80 |
| /servicios        |            867.46 |  850.57 |  827.73 |
| /api/home         |            887.93 |  845.21 |  826.80 |
| /api/products     |            837.82 |  842.78 |  860.13 |
| /api/services     |            870.95 | 1036.32 |  907.75 |
| /api/health/live  |            994.15 | 1211.49 | 1290.52 |
| /api/health/ready |            854.79 |  893.94 |  859.14 |
| Detalle producto  |           2148.42 |  843.64 |  866.79 |
| Detalle servicio  |            862.35 |  842.98 |  838.83 |

Detalles utilizados, existentes en la base local; no se verificó que existan en el contenido desplegado:

- `/productos/ssd-adata-ultimate-su650-256gb-2-5inch-3d-nand-sata-6gb-s-hasta-520mb-s-interno`
- `/servicios/diagnostico-tecnico`

En /: DNS 32.45/30.21/2.68 ms, TCP 27.68/27.02/21.84 ms y TLS 163.43/164.38/157.26 ms. No se obtiene duración exacta de función restando esas métricas al TTFB.

## 5. Logs relevantes y límites de observabilidad

Cabeceras remotas: server Vercel, content-type text/plain, cache-control public,max-age=0,must-revalidate, X-Vercel-Cache MISS y error FUNCTION_INVOCATION_FAILED. No llegó X-Request-ID de la aplicación. El prefijo iad1 es un marcador observado; no demuestra por sí solo la región configurada de la función ni la de Neon. MISS de Vercel no es el estado de la caché pública de Nitro.

Pendientes privados: stack completo, Runtime/Function Logs, Build Logs del deployment, duración y cold start por invocación, región efectiva, memoria, maxDuration, plan, runtime y preset generado. También provider, host redactado, pooling, SSL y región de la URL de Neon. No hay conexiones autorizadas de Vercel/Neon disponibles en esta sesión; se ofrecieron una vez y se solicitó acceso o logs sin secretos.

Localmente se reprodujo la advertencia de pg sobre client.query concurrente en la ruta de transacciones Prisma. Es una deprecación, no un crash ni evidencia causal del 500. El verificador existente también puede emitir DEP0190 por spawn con shell; no se cambió preventivamente.

## 6. Arquitectura del request

`request → middleware Nitro → SSR Nuxt → useAsyncData → API interna → servicio → Prisma/pg → PostgreSQL → DTO/payload → HTML → JS/hidratación`.

Home espera `useAsyncData('public-home', () => $fetch('/api/home'))`; además header y footer cargan navegación y settings públicos. El handler de Home combina catálogo/settings, servicios destacados y dos ubicaciones de banners. En SSR, $fetch relativo resuelve internamente el handler; no supone un viaje HTTP a localhost.

En navegador se verificaron claves public-home, public-navigation y public-settings en el payload SSR, sin solicitudes API duplicadas durante hidratación en las muestras. firstApiMs es null cuando no existe una petición API de navegador, no una API de cero ms.

## 7. Tiempos de desarrollo

Tiempos desde creación del proceso, salvo la columna de primera respuesta:

| Control                              | Vite cliente listo | Vite servidor listo | Nitro listo | Primera / TTFB | Segunda / tercera |
| ------------------------------------ | -----------------: | ------------------: | ----------: | -------------: | ----------------: |
| DevTools off, DEBUG hijo vacío       |           10.359 s |            10.401 s |    23.343 s |       17.934 s |        85 / 80 ms |
| DevTools on, DEBUG hijo vacío        |           14.740 s |            14.891 s |    30.410 s |       18.151 s |        96 / 78 ms |
| DevTools off, DEBUG=release heredado |           11.420 s |            11.529 s |    26.020 s |       19.474 s |      108 / 121 ms |

Hay costo real de compilación bajo demanda/desarrollo: Nitro listo no equivale a Home ya compilada. Home hidratada en contextos nuevos, servidor previamente consultado: off 7352/1927/1659 ms; on 9363/1969/2011 ms. No es rendimiento de producción.

DevTools añadió aproximadamente 7.1 s al ready en este par de controles, con una sola ejecución por condición y posible efecto del orden/caché del sistema. No atribuirle los 18 s completos de primera Home ni prometer una ganancia universal. Ya es opt-in y se deshabilita en producción en el HEAD auditado.

DEBUG=release estaba heredado del entorno; quitarlo solo de los hijos reduce ruido de diagnóstico, pero no demuestra que explique toda la latencia. El costo CPU exacto de cada módulo/CSS/UI no se aisló; requiere perfil adicional, no una acusación a Reka UI por intuición.

## 8. Producción local: build, preview y HTTP

Build controlado sin DEBUG: **181.089 s** hasta completar, Nitro compilado a los 176.020 s. Es tiempo de construcción, no de cada solicitud.

Preview CLI hasta Listening: 10.093 s; controles adicionales 10.160/9.511 s. El artefacto ejecutado directamente con `node .output/server/index.mjs` escuchó en **559/520 ms**. Por tanto, no atribuir los diez segundos de CLI al arranque intrínseco de la función.

Preview sin DEBUG, todos 200; TTFB ms y bytes de respuesta:

| Ruta              | Primera muestra | Segunda | Tercera | Payload bytes |
| ----------------- | --------------: | ------: | ------: | ------------: |
| /                 |         1447.75 |   83.93 |  106.61 |         36513 |
| /productos        |          545.27 |   83.82 |   71.77 |         46747 |
| /servicios        |          102.20 |   50.12 |   55.49 |         26784 |
| /api/home         |           10.79 |   13.86 |   15.91 |           873 |
| /api/products     |           17.97 |   13.41 |   13.06 |          4478 |
| /api/services     |           16.48 |   14.11 |   12.98 |           695 |
| /api/health/live  |           21.40 |   12.44 |   12.56 |            15 |
| /api/health/ready |           24.23 |   13.68 |   13.17 |            15 |
| Detalle producto  |          370.87 |   63.69 |   58.77 |         37373 |
| Detalle servicio  |          208.25 |   88.06 |  125.58 |         36382 |

Solo / primera era cold verificado en esta secuencia. Las APIs ya estaban calentadas por SSR. Duración real del servidor para /, correlacionada por request ID: 1428/79/104 ms; para /api/home: 8/11/11 ms. DB duration por estas peticiones: no instrumentada; no sustituirla por el perfil independiente.

## 9. Cold start remoto y controles fríos locales

Vercel cold TTFB: **no verificable sin logs de invocación**; primeras observadas en §4 no equivalen a cold.

Controles independientes, cada uno en proceso nuevo:

| Primera ruta                        | Cold TTFB local | Segunda / tercera |
| ----------------------------------- | --------------: | ----------------: |
| /api/home en preview                |       734.31 ms |  16.71 / 12.82 ms |
| /api/health/ready en preview        |       271.54 ms |  16.29 / 15.16 ms |
| /api/health/live en runtime directo |        34.11 ms |   8.48 / 12.12 ms |
| / en otro runtime directo           |      1568.28 ms |  73.83 / 84.42 ms |

Live no consulta DB y responde rápido. La primera Home incluye inicialización/SSR/cachés y dependencias, no solo SQL. No extrapolar este PostgreSQL local a Neon suspendido.

## 10. Warm remoto

Vercel warm TTFB: **no verificable**; llamadas segunda/tercera en §4 siguen siendo errores. No hay HTML funcional, hidratación o LCP de la aplicación que medir allí. Las llamadas locales posteriores sí muestran respuestas estables rápidas en los controles principales, con las excepciones registradas en §17.

## 11. Conexión PostgreSQL y Prisma

Perfil local, conexión explícita pg: **66.80 ms**. SELECT 1: **3.10 / 0.61 / 0.61 ms**. Primer SELECT 1 Prisma: **194.46 ms**, que incluye inicialización/conexión/driver; siguientes **2.67 / 1.26 ms**.

La URL local apunta a localhost, sin pooler remoto ni sslmode; esto es correcto como descripción del entorno local, no de Neon. No se imprimieron credenciales. No se auditó la URL privada real del deployment, por lo que no se cambió pooling, SSL, región ni DATABASE_URL.

Hay un único constructor de aplicación en server/utils/prisma.ts. No se instancia por request. Reutiliza global en desarrollo y caché de módulo por instancia en producción; distintas funciones no comparten singleton. Se crea el adapter al evaluar el módulo, incluso al reutilizar el cliente global en HMR: no demuestra por sí solo un pool abierto adicional ni fuga. El constructor observado no ejecuta consultas eager.

## 12. Query profiling

Perfil real de servicios sin caché, tres muestras ms:

| Operación     |      1 |     2 |     3 |               Eventos de query |
| ------------- | -----: | ----: | ----: | -----------------------------: |
| home.settings |  71.86 |  5.01 |  1.68 |                              1 |
| home.services |  73.98 |  3.31 |  4.27 |                              3 |
| home.banners  |  19.74 |  8.32 |  3.31 |                              2 |
| home.total    | 113.09 |  5.98 |  4.89 |                              6 |
| products.list | 124.62 | 68.34 | 71.53 | 16, incluido COMMIT: 15 SELECT |
| services.list |  19.26 | 15.16 | 17.53 |                              4 |

La base perfilada contiene siete productos y un servicio: no es prueba de carga. Eventos incluyen duración del driver/esperas y pueden solaparse; sumarlos no da el camino crítico SQL. Se guardaron hashes/tablas/duración sin parámetros ni contenido de usuarios.

Hay lecturas repetidas de settings entre Home, impuestos y footer. Las relaciones observadas son consultas por lotes; no se demostró un N+1 dependiente del número de productos. No se halló una consulta persistentemente lenta que justifique EXPLAIN ANALYZE o un índice nuevo. No se añadieron migraciones.

## 13. SSR, middleware e inicialización

Home espera su read model antes de emitir HTML; las ramas paralelas no eliminan el costo de inicialización. El perfil home.total de seis queries no incluye dos consultas de límites de programación que el wrapper de caché ejecuta en miss, identificadas en código, ni todas las lecturas del layout. No presentar seis como recuento medido de todo el SSR.

El guard global admin retorna pronto en páginas públicas y /admin/login. El middleware de sesión solo aplica a /api/admin y /api/_auth/session. nuxt-auth-utils sí consulta la sesión durante SSR anónimo (1–8 ms observados), pero sin cookie válida retorna antes de consultar usuario activo en DB. Una sesión administrativa válida puede revalidar usuario al visitar público; se conserva esa seguridad.

Headers, request ID y no-store no realizan IO remoto pesado. La validación de entorno corre una vez al inicializar Nitro, sin consultas DB ni red; exige URL de DB, tres secretos independientes fuertes y origen público HTTPS. La .env local carece de algunos requisitos productivos; los controles productivos suministraron valores efímeros. **Esto no prueba que falten en Vercel**.

## 14. Hidratación y navegador

Preview, contexto nuevo y servidor ya consultado; tiempos desde navigationStart:

| Ruta             | Hidratación completa 1 / 2 / 3 ms | LCP 1 / 2 / 3 ms  |
| ---------------- | --------------------------------- | ----------------- |
| /                | 611 / 431 / 462                   | 392 / 292 / 312   |
| /productos       | 525 / 491 / 590                   | 696 / 512 / 944   |
| /servicios       | 424 / 410 / 392                   | 548 / 516 / 712   |
| Detalle producto | 599 / 489 / 529                   | 984 / 1428 / 1108 |
| Detalle servicio | 461 / 460 / 522                   | 716 / 488 / 564   |

Home TTFB de navegador: 102.2/57.8/60.6 ms. DCL y load completos constan en los JSON; el marcador no es una medida formal de TTI. Mayor tarea larga Home: 189/111/109 ms. Sin errores de página ni hydration mismatch en estas muestras.

Mobile 390×844: Home hidratada 657/420/422 ms, LCP 384/232/244 ms. Vercel: no aplicable mientras responda una página de error.

## 15. Bundle y dependencias

Inventario del artefacto: 88 JS, 1,164,694 bytes raw / 382,094 gzip; CSS 209,772 raw / 28,289 gzip. Estos totales son **todas las rutas**, no la descarga de Home. Chunks principales: componentes 180,744; entry 158,921; layout admin 117,505; Button 106,836 bytes. Nitro completo del primer build: 29.7 MB (10.9 MB gzip), distinto de JS de navegador.

En Home se observaron 37 entradas de recursos JS, 36 URLs únicas, 815,874 bytes transferidos por URL; CSS 210,072 bytes. Son respuestas locales sin compresión CDN e incluyen overhead/prefetch; no equivalen al tamaño comprimido en Vercel. Diez recursos con initiator script no son todo el JS descargado.

El chunk real del layout admin Ca1Ng1rB.js se descarga en Home: 117,805 bytes de transferencia. En un control comenzó a 147/87/75 ms y terminó a 243/157/155 ms, antes de completar hidratación a 593/524/448 ms. Su contenido confirma sidebar/dashboard/admin. No se cargaron ProductAdminForm ni ServiceAdminForm. Queda por aislar preload/prefetch y ejecución: descargar antes no demuestra bloqueo ni cuantifica ganancia al retirarlo.

Nuxt genera imports dinámicos de layouts; no se propone reescribirlos a ciegas. Instalado Nuxt UI 4.11.0; candidato 4.12.0 tiene mejoras documentadas de imports Reka, carga diferida de componentes y reactividad de enlaces. Evaluarlo en bloque frontend separado: riesgo de tipos, foco, overlays y regresiones visuales. No se actualizó Nuxt UI, Reka ni el lockfile.

## 16. LCP, imágenes, fuentes e iconos

La consulta de banners activos devolvió cero: el LCP medido es el logo de fallback, no una campaña Hero. Logo PNG: 74,255 bytes, intrínseco 948×581, dimensiones de presentación controladas y decoding async. Su uso en tres posiciones comparte URL y descarga. No inventar una prueba de srcset de un banner inexistente.

Cuando hay campaña, el código contempla mobileImageUrl, dimensiones 720×600 y fetchpriority high. NuxtImg sí se usa en productos, galerías, servicios y categorías. Hosts remotos observados incluyen scoretms.tecnomegastore.ec, static.wixstatic.com e icontinental.edu.pe; algunas imágenes lazy no habían acabado a los 750 ms. Eso no explica FUNCTION_INVOCATION_FAILED. No se cambiaron URLs, R2 ni arquitectura de medios.

Fuentes del sistema; en la muestra mobile no hubo recursos de fuente externa. No se demostró bloqueo de fuentes.

Sí se observaron fetch de iconos Lucide a api.iconify.design desde servidor: 19–826 ms según solicitud/control. No hay colección local @iconify-json instalada. Propuesta: valorar solo Lucide fijado, medir antes/después; no instalar todas las colecciones. No se demostró que Iconify causara los outliers de varios segundos.

## 17. Causa raíz: demostrado frente a desconocido

Demostrado: el costo severo reproducible local está en el flujo de desarrollo/compilación inicial, no en una consulta SELECT 1 recurrentemente lenta. El runtime productivo sin DB arranca en aproximadamente medio segundo y live responde en 34 ms cold. El primer SSR productivo cuesta 1.45–1.57 s; los siguientes son mucho menores. DevTools agrava el startup en el control, pero no explica todo.

No demostrado: excepción causante del 500 remoto, pooler/SSL/regiones, saturación Neon o incompatibilidad runtime. Que falle incluso live sin DB es compatible con fallo de inicialización/función, pero no identifica qué import/plugin falla.

Outliers reales conservados: /productos en navegador llegó a TTFB 8330.5 ms en el primer preview con DEBUG heredado y a 6663.9 ms en un control dev. No se reprodujeron en los controles posteriores instrumentados con request ID. No se borran ni se declaran resueltos; falta correlación contemporánea para atribuirlos a DB, red o proceso.

## 18. Cambios aplicados

Solo herramientas diagnósticas independientes, sin imports desde la aplicación:

- scripts/audit-performance.mjs: HTTP y Playwright, rutas permitidas, métricas/red/payload/errores.
- scripts/audit-database.mjs: guard de DB local, conexión, SELECT 1 y perfil de servicios reales.
- scripts/audit-network.mjs: preload opt-in, fetch de Iconify y tiempos HTTP correlacionados.
- scripts/audit-startup.mjs: controles de procesos dev/build/preview/runtime y limpieza del árbol hijo.
- Este reporte.

Salidas en logs/performance-audit, ignoradas por git. No se añadió endpoint diagnóstico público. No se cambiaron lógica comercial, seguridad, SSR, caché, migraciones, esquema, dependencias ni variables de entorno del proyecto.

## 19. Before/after y reproducción

**No hay corrección de aplicación aplicada y por tanto no existe after de un fix.** Los controles son comparaciones del mismo HEAD, no una mejora de código entregada.

Comandos de herramientas:

```powershell
node scripts/audit-database.mjs
node scripts/audit-startup.mjs dev
node scripts/audit-startup.mjs build
node scripts/audit-startup.mjs preview
node scripts/audit-startup.mjs runtime
node scripts/audit-performance.mjs http
node scripts/audit-performance.mjs browser
```

Configurar AUDIT_BASE_URL y AUDIT_LABEL para medición explícita; las herramientas restringen destino/rutas. AUDIT_DEVTOOLS controla el experimento local; AUDIT_DEBUG_INHERIT conserva DEBUG solo cuando se desea compararlo. Revisar las variables declaradas en cada script antes de repetir. No ejecutar con URLs comerciales arbitrarias.

Evidencias principales: database.json; devtools-off/on-_.json; preview-no-debug-_.json; preview-no-debug-mobile-api-first-_.json; preview-no-debug-ready-first-_.json; runtime-no-debug-live-first-_.json; runtime-no-debug-home-bundle-_.json; vercel-http.json; vercel-details-http.json.

Tras cada corrección aprobada repetir cold y warm sobre SHA identificado, al menos tres muestras, comparando /, /api/home, ready, startup, hidratación y LCP. Objetivo inicial: recuperar 200 remoto y no degradar baseline warm ni hidratación/seguridad; una reducción de startup debe exceder variación entre controles repetidos. No prometer un TTFB geográfico arbitrario desde PostgreSQL local.

## 20. Riesgos y matriz de propuesta

| Problema                     | Evidencia                               | Impacto / causa                                  | Solución propuesta                                                             | Riesgo                | Archivos                                              | Migración DB   | Ganancia esperada                        | Prioridad |
| ---------------------------- | --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ | --------------------- | ----------------------------------------------------- | -------------- | ---------------------------------------- | --------- |
| Deployment falla             | Todas las rutas 500                     | Sitio inaccesible; excepción privada desconocida | Bloque A: obtener stack y corregir solo causa real                             | Según error           | Plugin/env/config únicamente si el stack lo demuestra | No prevista    | Restaurar servicio, no cuantificable aún | P0        |
| Primera Home dev muy lenta   | 17.9–19.5 s                             | Compilación inicial; módulo dominante no aislado | Perfil CPU de Vite/Nitro y experimento acotado                                 | HMR/resolución        | nuxt.config.ts solo tras aislar                       | No             | Por medir en controles repetidos         | P1        |
| Invalidación entre funciones | Storage memory                          | Versiones/caché no globales                      | Bloque D: validar política multiinstancia y frescura; diseñar antes de cambiar | Stock/precio obsoleto | public-cache y handlers                               | No prevista    | Consistencia; rendimiento desconocido    | P1        |
| Primer SSR productivo        | 1.45–1.57 s                             | Inicialización compuesta                         | Bloques B/C solo si perfil remoto identifica DB; no subir timeout              | Pool/costos           | prisma/servicios según evidencia                      | No justificada | Por medir                                | P2        |
| DevTools/DEBUG               | A/B startup y entorno heredado          | Sobrecarga local, no toda la demora              | Conservar opt-in; no alterar entorno global                                    | Diagnóstico/HMR       | Config ya opt-in                                      | No             | Diferencia observada, no garantía        | P2        |
| Admin JS en Home             | 117.8 KB transferidos antes de hidratar | Banda extra; bloqueo no probado                  | Bloque E: aislar origen de preload/prefetch                                    | Navegación/layout     | Layouts y configuración de build si corresponde       | No             | Menos bytes si se elimina sin regresión  | P3        |
| Iconify remoto               | Fetch 19–826 ms                         | Dependencia de red observable                    | Bloque E: colección Lucide local fijada                                        | Tamaño/iconos         | package.json/lock/config                              | No             | Eliminar ese fetch; medir SSR            | P3        |
| Lecturas repetidas           | Perfil de settings/relaciones           | Round-trips; latencia Neon desconocida           | Bloque C: deduplicar solo con medición remota                                  | Frescura/impuestos    | Servicios/read models                                 | No justificada | Desconocida                              | P4        |
| Nuxt UI candidato            | Release 4.12.0                          | Mejoras upstream, no prueba local                | Experimento independiente y reversión fácil                                    | Overlays/foco/tipos   | package/lock/componentes                              | No             | Por medir                                | P4        |

Caché pública actual: memoria por proceso; TTL categorías/marcas/settings 300 s, servicios 120 s, productos 30 s, Home 60 s y banners 30 s; claves canónicas hash/versionadas, deduplicación pending, límite 512, clone de DTO, deadlines e invalidación selectiva con fallo cerrado. HIT local fue observado. No existe garantía de invalidación global entre instancias Vercel ni persistencia entre cold starts.

ISR/hybrid podría reducir SSR público, pero requiere definir frescura comercial e invalidación. No se añadió routeRules, Redis ni deshabilitado caché. Admin, checkout, pedidos y tickets nunca deben quedar en caché pública. La invalidación multiinstancia es una revisión arquitectónica pendiente, no permiso para introducir infraestructura.

Nuxt autodetecta Vercel: el preset node-server del build local es esperado y no prueba que el remoto esté mal. Node 24 está soportado por Vercel según documentación actual; el runtime efectivo del deployment sigue desconocido. Un artefacto Windows con binarios sharp win32 no debe subirse a Linux: no se demostró que eso ocurriera en este deployment.

## 21. Tests y validación local

- Prisma validate: PASS.
- Typecheck: PASS.
- Build productivo controlado: PASS.
- Lint completo (pnpm lint), formato completo (pnpm format:check) y node --check de las cuatro herramientas: PASS en la comprobación final.
- HTTP y Playwright diagnósticos de producción local: estados 200 en rutas públicas probadas, sin errores de página ni mismatch; no sustituyen la suite funcional ni visual.
- Vitest unitario: PASS, 11 archivos y 91 pruebas.
- Integración en base temporal aislada: PASS, 9 archivos y 52 pruebas; 14 migraciones aplicadas, seed, estado de migraciones y barcode nullable/unique verificados. El verificador terminó con código 0 y eliminó la base temporal generada; no se eliminó información comercial.
- E2E completo y visual: no repetidos localmente en esta auditoría; sí verificados en CI del HEAD auditado (§22).

El verificador de integración crea una base aleatoria con prefijo ajk_phase85_empty_, aplica migraciones/seed y finalmente elimina únicamente esa base generada. No modifica la base comercial. Ninguna lógica de migraciones fue creada ni modificada.

Comprobación de cierre de esta entrega: HEAD sin cambios, únicamente este documento y las cuatro herramientas nuevas sin commit; sin listeners de auditoría en 3015/3016. Los archivos de mediciones permanecen ignorados por git.

## 22. GitHub Actions

CI del HEAD exacto auditado: **GREEN**.

[Run 39158855607](https://github.com/ViudaNegra17/ajksolutions-ecommerce/actions/runs/39158855607), job 117767673096, creado 2026-10-18T19:27:32Z.

Verificados individualmente los 16 gates pnpm: install frozen, prisma format check, validate, generate, migrate deploy, migrate status, seed, lint, format check, typecheck, Vitest, verificación DB vacía, instalar Chromium, E2E, visual y build.

Esto valida el baseline de aplicación, **no un nuevo commit de las herramientas/documento aún sin commitear**. No se hizo push ni se disparó un nuevo CI.

## 23. Deployment final

No hubo redeploy ni se aplicó corrección productiva. El deployment auditado sigue fallando en las muestras capturadas. No declarar producción lista, fase cerrada ni smoke remoto satisfactorio. Los 200 locales no prueban salud de Neon/Vercel.

## 24. Pendientes y siguiente paso

1. Obtener Runtime/Function Logs del deployment e invocación de §3, stack completo y Build Logs; confirmar SHA desplegado, runtime, preset, límites y regiones.
2. Inspeccionar metadatos no secretos de Neon: host redactado, pooler/direct, SSL, región y estado de suspensión; medir conexión y query remotas solo con acceso autorizado.
3. Presentar corrección mínima de bloque A; B solo si hay evidencia DB. Aprobar y ejecutar por separado de frontend.
4. Bloques C/D/E solo con experimento y baseline específico; cada uno: before → cambio → after → tests → commit.
5. Antes de cierre definitivo: suite completa, visual, CI del nuevo SHA, redeploy aprobado y smoke remoto 200.

No se inicia Fase 9 ni se hacen correcciones preventivas. La parte privada de diagnóstico Vercel permanece bloqueada por falta de logs/acceso, no por falta de una hipótesis.

## Referencias oficiales

- [Nuxt: introducción](https://nuxt.com/docs/4.x/getting-started/introduction), [data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching), [$fetch interno y payload](https://nuxt.com/docs/4.x/api/utils/dollarfetch).
- [Nuxt: rendering e hybrid](https://nuxt.com/docs/4.x/guide/concepts/rendering), [deploy](https://nuxt.com/deploy), [Vercel autodetect](https://nuxt.com/deploy/vercel).
- [Nuxt UI](https://ui.nuxt.com/docs/getting-started), [release 4.12.0](https://ui.nuxt.com/docs/releases/v4.12.0).
- [Vercel: FUNCTION_INVOCATION_FAILED](https://vercel.com/docs/errors/function_invocation_failed), [Runtime Logs](https://vercel.com/docs/logs/runtime), [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- [Neon: connection pooling](https://neon.com/docs/connect/connection-pooling). La documentación Prisma Neon consultada redirige a v6: no trasladar recetas de parámetros v6 automáticamente al adapter Prisma 7.
- [Vite: SSR](https://vite.dev/config/ssr-options), [pre-bundling](https://vite.dev/guide/dep-pre-bundling.html).
