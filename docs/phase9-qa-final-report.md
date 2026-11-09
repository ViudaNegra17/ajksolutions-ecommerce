# Fase 9 — Informe de QA y auditoría V1

Fecha 2026-11-08, America/Guayaquil. Historial de auditoría y estado vigente de fase 9.

## Actualización vigente — PASS 27

**PASS 27 PASSED.** Se completó la remediación compatible de dependencias y su regresión local. El audit completo cambió de 3 Critical / 35 High / 32 Moderate / 11 Low a 0 / 2 / 2 / 1. El audit --prod tiene 0 Critical y 0 High. Los cinco residuales corresponden a Happy DOM de pruebas y glob/minimatch/deepmerge de build, con condiciones, aceptación técnica temporal y ausencia ejecutable documentadas. [Remediación y reporte completo](phase9-dependency-remediation.md).

Pasaron Prisma, lint, formato, tipos, 169 Vitest, el ensayo de base vacía con 57 integraciones adicionales, 62 E2E, 19 visuales y build. El reensayo del artefacto aprobó diez rutas SSR, payload, hidratación, JSON-LD presente, NuxtImg, WebP/AVIF, sesión y Seguridad. Se conservaron los intentos fallidos del script SSR y se ajustó su uso de la ruta /admin/login, layout y comprobaciones negativas. [Gates](phase9/pass27-regression.json), [SSR final](phase9/pass27-ssr.json), [reensayo](phase9/pass27-ssr-recheck.json).

La inspección cubrió 792 archivos JavaScript y 235 source maps. Los paquetes críticos originales y los cinco residuales están excluidos del artefacto ejecutable. Schema y los SQL de 14 migraciones conservan hashes. Las bases temporales se eliminaron. El código del PASS se registra en b03f41b339427194bb45f1b503be57efe7f715ce. [Artefacto](phase9/dependency-artifact-after.json).

El cierre general de fase 9 sigue condicionado a los hallazgos operativos F9-05 a F9-09 registrados abajo. El servidor local restaurado y sus respuestas se registran en [comprobación local](phase9/pass27-local-server.json).

## Historial de revisión local y Seguridad

La [matriz final del PASS 27](phase9/pass27-final-checks.json) consolida la regresión y el reensayo SSR aprobado.

El usuario cambió el alcance de esta revisión a `http://localhost:3000` y autorizó implementar usuarios y roles. La ruta `/admin/seguridad` ya muestra un módulo funcional con búsqueda, alta, edición, activación y asignación de los cuatro roles existentes. Se verificaron permisos por API y URL, sesiones previas al cambio de rol, auditoría y rollback.

La navegación local real cubrió 23 rutas en los 16 tamaños de pantalla requeridos, 368 comprobaciones. Todas las rutas respondieron 200, hidrataron y mantuvieron un H1, sin overflow horizontal ni errores JavaScript observados. En Seguridad se comprobaron tabla visible y cuatro tarjetas de roles. [Evidencia local](phase9/local-review.json).

Los ensayos específicos aprobaron seis pruebas unitarias, cinco de integración PostgreSQL y cinco E2E. La implementación y sus decisiones están en [Seguridad administrativa y revisión local](implementation-phase-9-local-security.md).

**El cierre sigue PARTIAL.** La auditoría del lockfile instalado reportó 3 avisos críticos, 35 altos, 32 moderados y 11 bajos. Los críticos llegan por Nuxt DevTools a `@simple-git/argv-parser`, `simple-git` y `shell-quote`. Su alcance efectivo y remediación compatible deben resolverse antes del cierre. [Inventario de dependencias](phase9/local-dependencies.json).

El resultado productivo previo se conserva abajo como historial. Las comprobaciones de esta actualización usan localhost y bases temporales. La regresión completa aprobó Prisma, lint, formato, tipos, 169 pruebas Vitest, 62 E2E, 19 visuales y build. La base temporal se eliminó al finalizar y los hashes de schema y de las 14 migraciones permanecieron iguales. [Gates locales completos](phase9/local-quality-gates.json).

## Historial de la auditoría inicial

## Estado

**PARTIAL — auditoría inicial ejecutada, cierre V1 pendiente.**

Commit inicial y producción observada `5636093f1d9ed4536525f9fffeab51f21e4436ab`, rama `main`. El árbol estaba limpio al comenzar. Los cambios de esta entrega se encuentran en el working tree.

El [baseline](phase9-baseline.md) registra versiones, base activa, migraciones y deployment. El [runbook](production-runbook.md) contiene el procedimiento operativo actualizado.

## Baseline y producción

Vercel confirmó deployment `dpl_8mPXuEbmgrwviwSp9cRDXrkYA9Td`, target `production`, estado `READY`, Node `24.x`, framework `nuxtjs`, región `iad1` y SHA coincidente con HEAD. [Evidencia del deployment](phase9/vercel-deployment.json).

La URL vigente es `https://ajksolutions-ecommerce-neon.vercel.app`. La URL histórica sin `-neon` devolvió 404 `DEPLOYMENT_NOT_FOUND` y fue reemplazada en la referencia de esta auditoría tras confirmación del usuario.

Se verificaron Home, catálogo, servicios, login, carrito, checkout, robots y sitemap con HTTP 200. Ambos health checks respondieron HTTP 200 con `{"status":"ok"}`. Readiness ejecuta `SELECT 1`, por lo que demuestra acceso DB del runtime durante la comprobación. La versión y configuración privada de Neon requieren revisión operativa adicional. [Evidencia HTTP y navegador](phase9/production-smoke.json).

## Correcciones sustentadas por fallos

| ID    | Prioridad | Evidencia inicial                                                                                           | Corrección                                                                                                         |
| ----- | --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| F9-01 | P2        | Prettier señaló `PublicHomeContact.vue`                                                                     | Formato del componente                                                                                             |
| F9-02 | P2        | Vitest esperaba el aviso anterior “otra pestaña”, mientras el componente vigente dice “Se abrirá WhatsApp.” | Ajuste del texto esperado. Se mantienen URL, mensaje, target, rel, nota accesible y fallback                       |
| F9-03 | P2        | E2E de fase 8.5 esperaba que HOME_HERO sustituyera el H1 del Hero definitivo                                | Se comprueban Hero fijo y ambas campañas administrables, con imágenes móviles, descripción y CTA                   |
| F9-04 | P2        | E2E de catálogo esperaba el antiguo H1 “Tecnología”                                                         | Se comprueba el título vigente y se navega pulsando el CTA real del Hero antes de filtrar                          |
| F9-10 | P2        | El reensayo recibió HIT de catálogo con categorías vacías después de crear fixtures directamente con Prisma | El setup publica la categoría mediante la API administrativa existente, activando la invalidación normal del cache |

La documentación vigente del [Hero responsive](ui-hero-responsive-improvement.md) mantiene composición definitiva y campañas separadas. Las correcciones de prueba conservan esa decisión del usuario. Las aserciones funcionales siguen activas.

## Hallazgos abiertos y prioridades

| ID    | Prioridad         | Hallazgo                                                                                                                                                                              | Siguiente comprobación                                                                                                        |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| F9-05 | P1, investigación | Primera navegación Home con TTFB 9768,6 ms y LCP 10804 ms. En la repetición, Home tuvo TTFB 397,2–458,5 ms y LCP 1492–1692 ms                                                         | Repetir muestras temporales y correlacionar request IDs con Runtime Logs y latencia DB. La causa queda pendiente de evidencia |
| F9-06 | P2                | Imagen externa de Diagnóstico técnico falla con `net::ERR_BLOCKED_BY_ORB` en catálogo y ficha de servicio                                                                             | Revisar URL/MIME/permisos del origen y definir imagen comercial válida o fallback verificado                                  |
| F9-07 | P2                | Se reproduce la deprecación pg por consultas sobre un cliente ya ocupado. La traza comienza en Client.query de pg y continúa en PgTransaction.performIO/queryRaw del adaptador Prisma | Identificar la operación de aplicación que origina esa cadena y evaluar compatibilidad antes de modificar consultas           |
| F9-08 | P2                | Home carece de JSON-LD Organization/WebSite en las muestras                                                                                                                           | Evaluar datos reales disponibles y completar la revisión SEO del PASS 12                                                      |
| F9-09 | P3                | Build emite deprecaciones de exports con patrón de slash final                                                                                                                        | Registrar dependencias implicadas y evaluar corrección compatible en el PASS 27                                               |

Se mantiene abierto F9-05 por su impacto potencial en la entrada comercial. La primera muestra permanece en [production-smoke-first.json](phase9/production-smoke-first.json). El segundo muestreo verifica explícitamente `[data-public-app][data-hydrated=true]`. Ambos se realizaron mientras el equipo ejecutaba QA local y con red sin throttling. Los resultados requieren contextualización antes de atribuir una causa.

El recorrido inicial cubierto no reveló un P0. La revisión de seguridad y flujos completa sigue abierta.

## QA funcional, Admin y RBAC

Las suites existentes se ejecutaron contra PostgreSQL temporal con las 14 migraciones y seed de prueba. Incluyen catálogo, precios, disponibilidad, flujo PHYSICAL, compra directa DIGITAL, tickets, formularios, administración, sesiones, inventario y cache.

La primera ejecución E2E obtuvo 53 aprobadas, dos fallidas por expectativas antiguas y dos sin ejecutar al interrumpirse el grupo serial afectado. El primer reensayo expuso el fixture/cache descrito en F9-10. Tras corregir su preparación, los dos archivos completos aprobaron sus ocho pruebas. El reensayo integral de Vitest aprobó 158 pruebas, incluidas las de integración con DB.

En producción se revisaron tres APIs administrativas sin sesión. `/api/admin/products`, `/api/admin/orders` y `/api/admin/tickets` respondieron 401. El POST anónimo a `/api/_test/admin-session` respondió 404. La revisión autenticada por cada rol en producción y la matriz completa de casos negativos siguen pendientes. [Evidencia](phase9/production-smoke.json).

## Responsive y accesibilidad

Se realizaron diez navegaciones productivas, cinco rutas en 390×844 y 1440×900. Rutas examinadas, Home, catálogo, servicios, `/productos/unlocktool` y `/servicios/diagnostico-tecnico`.

En el segundo muestreo las diez páginas hidrataron correctamente, mantuvieron un H1 y carecieron de overflow horizontal y errores JavaScript. Los snapshots locales cubren 19 escenarios públicos y administrativos. La matriz de 16 viewports para todas las páginas y la auditoría completa de teclado, foco, contraste y dialogs continúan abiertas.

[Captura móvil](phase9/production-home-390.png) y [captura escritorio](phase9/production-home-1440.png).

## Performance

Muestras de laboratorio sin throttling, expresadas en milisegundos.

| Ruta                | TTFB desktop / móvil | LCP desktop / móvil | CLS observado |
| ------------------- | -------------------- | ------------------- | ------------- |
| Home                | 458,5 / 397,2        | 1492 / 1692         | 0 / 0         |
| Catálogo            | 102,5 / 91,5         | 1228 / 956          | 0 / 0         |
| Servicios           | 132 / 90,9           | 716 / 592           | 0 / 0         |
| Unlocktool          | 97,6 / 212           | 1948 / 680          | 0 / 0         |
| Diagnóstico técnico | 100,8 / 159,9        | 492 / 644           | 0 / 0         |

Las muestras corresponden a navegaciones observadas. El estado frío del servidor Vercel y los datos de campo Core Web Vitals siguen por medir. INP, atribución de chunks administrativos y costes de queries requieren su auditoría específica. Los JSON incluyen FCP, scripts solicitados y cantidad de recursos para seguimiento.

También se inició un proceso nuevo del artefacto productivo local en el puerto 3020, con PostgreSQL local y secretos efímeros. Después de un probe de liveness, la primera solicitud HTML de Home tuvo headers en 1709 ms y total de 1711 ms. Las dos siguientes tuvieron headers en 88 y 83 ms. Quince solicitudes a cinco rutas respondieron 200. El proceso se detuvo al finalizar. Las primeras solicitudes de las otras rutas corresponden a un proceso ya iniciado. [Mediciones HTTP del build local](phase9/local-build-http.json).

Las diez navegaciones del segundo muestreo no registraron solicitudes a Iconify remoto ni a `/api/_nuxt_icon/*`. El seguimiento de bundles queda abierto. La imagen de servicio fallida limita la interpretación de su LCP. [Datos de medición](phase9/production-smoke.json).

## SEO y seguridad

- Home, catálogo y servicios emiten title, descripción y canonical del origen confirmado.
- Robots permite el portal y excluye admin, API y transacciones.
- Sitemap contiene rutas públicas y fichas observadas del dominio correcto.
- La ficha de producto examinada contiene Product y BreadcrumbList parseables. La de servicio contiene Service parseable.
- Se observaron CSP con `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy y HSTS.
- La cobertura de CSP, cookies autenticadas, rate limits y revocación productiva requiere validación adicional.
- La ruta inexistente de prueba respondió 404. El flujo de error 500 y la revisión exhaustiva de contenido sensible siguen abiertos.

Las pruebas productivas utilizaron lecturas públicas y una comprobación negativa del endpoint interno sin sesión. Las operaciones comerciales de prueba se realizaron en bases temporales.

## Database y cache

La base local `ajksolutions_ecommerce` ejecuta PostgreSQL 18.3 y tiene las 14 migraciones finalizadas. Las tres bases temporales recibieron deploy y seed independientes y se eliminaron al finalizar cada ejecución. Los manifiestos confirmaron hashes idénticos del schema y de los 14 archivos SQL históricos antes y después de QA.

La aplicación usa cache en memoria por instancia. La invalidación entre instancias serverless, los límites de peticiones y el perfil de queries productivo requieren revisión adicional. La auditoría inicial conserva los contratos API y la semántica PHYSICAL/DIGITAL/SERVICE.

## Quality gates

Resultados y logs de la primera ejecución en [initial-checks.json](phase9/initial-checks.json). Reensayos y limpieza de la segunda base en [recheck-checks.json](phase9/recheck-checks.json).

| Control                          | Resultado verificado                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Prisma format --check y validate | PASS                                                                                  |
| Migraciones y seed               | 14 migraciones aplicadas y schema up to date en cada base temporal                    |
| Lint, formato y tipos            | Resultados finales en final-gates.json                                                |
| Vitest completo                  | PASS, 158 pruebas y 24 archivos tras corregir la expectativa de contacto              |
| E2E completo inicial             | 53 aprobados, 2 fallidos por expectativas antiguas y 2 sin ejecutar                   |
| Primer reensayo de dos archivos  | 5 aprobados, 1 fallo de fixture/cache y 2 sin ejecutar                                |
| Reensayo final de dos archivos   | PASS, 8 de 8, incluidos los casos afectados y los inicialmente sin ejecutar           |
| Visuales                         | PASS, 19 de 19 con snapshots existentes                                               |
| Build                            | PASS, artefacto node-server generado                                                  |
| Smoke productivo                 | Health 200 y páginas públicas comprobadas, tres APIs admin 401 y endpoint interno 404 |

La cobertura E2E satisfactoria reúne 49 casos de archivos intactos aprobados en la ejecución inicial y ocho casos aprobados en el reensayo final. La ejecución única de toda la suite después de estos ajustes y el CI del candidato final forman parte del cierre pendiente. Las evidencias conservan también los fallos iniciales.

Los resultados finales de lint, formato, tipos y revisión del diff se guardan en `docs/phase9/final-gates.json`. Los reensayos E2E y la limpieza de su base se registran en [e2e-final-checks.json](phase9/e2e-final-checks.json).

## Cobertura y trabajo restante

| PASS  | Cobertura inicial                                                  | Trabajo restante para cierre                                                          |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 0     | Baseline, commit, versiones, PostgreSQL, deployment y SHA          | CI verificable y configuración Neon                                                   |
| 1–7   | Suites existentes y smoke público productivo                       | Matriz completa de casos, permisos por rol y operaciones productivas controladas      |
| 8–10  | Diez navegaciones, H1, overflow y snapshots existentes             | Matriz completa responsive y revisión WCAG AA                                         |
| 11    | Mediciones productivas, build local y primer HTML en proceso nuevo | Atribución del pico Home, chunks, INP y recursos                                      |
| 12–15 | Metadata, sitemap, robots, JSON-LD, headers, health y request IDs  | SEO completo, cookies, CSP, runtime logs y Neon                                       |
| 16–20 | Cobertura de integración/E2E existente                             | Evidencia trazable de rollback, concurrencia, retry, handoff y errores para el cierre |
| 21–24 | Gates iniciales, visuales y bases temporales                       | CI completo del candidato final                                                       |
| 25    | Dependencia de definición comercial/legal identificada             | PENDING BUSINESS/LEGAL INPUT                                                          |
| 26    | Dominio y canonical coincidentes con producción                    | Verificar inventario privado de variables                                             |
| 27–32 | Versiones, 14 migraciones, cache y env revisados inicialmente      | Auditoría de dependencias, constraints/queries, cache y limpieza completa             |
| 33–36 | Runbook, informe y hallazgos priorizados                           | Resolver hallazgos y completar evidencias                                             |
| 37–40 | Criterio de cierre registrado                                      | Commit final, CI verde, deployment, smoke y decisión de cierre                        |

## CI, riesgos y estado final

El conector GitHub devolvió HTTP 404 al consultar el estado del SHA inicial. El estado real del workflow queda pendiente de evidencia accesible. El estado READY de Vercel y sus metadatos se registran por separado.

Persisten el pico de rendimiento por investigar, la imagen de servicio fallida, la revisión de configuración Neon, las comprobaciones integrales de seguridad y los contenidos legales/comerciales aprobados.

Estado de certificación **NOT PRODUCTION READY**, hasta completar los criterios de aceptación de la fase 9. Esta clasificación expresa el estado de la auditoría V1. La entrega inicial deja el baseline, las evidencias y el plan de continuidad registrados.
