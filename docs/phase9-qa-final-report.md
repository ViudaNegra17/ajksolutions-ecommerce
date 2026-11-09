# Fase 9 — Informe de QA y auditoría V1

Actualizado 2026-11-09, America/Guayaquil. Historial de auditoría y estado vigente de fase 9.

## Estado del pass final V1

FASE 9 CLOSED técnicamente. Clasificación TECHNICALLY PRODUCTION READY — BUSINESS/LEGAL PENDING. El candidato `93ea95cbb8f1ef5e3bf3fffcd3038fc0f9dbfe93` tiene CI GREEN y deployment exacto READY, con smoke final aprobado y login/panel confirmados manualmente por el operador. F9-06 CLOSED. F9-05 y F9-07 aceptados para V1 por el prompt de cierre. Final V1 Certification establece la disposición actual y prevalece sobre el historial que sigue.

## Historial de auditoría

## Actualización 2026-11-09 — investigación F9-05 y smoke F9-06

F9-05 PARTIAL. Se reprodujo TTFB 9673.5 ms y LCP 12760 ms en Chromium productivo. El request cc923c96-2bf4-43f0-947d-644cd5d958e3 se correlacionó con 1663.48 ms dentro de la aplicación. La causa completa del pico sigue pendiente de aislamiento. Se completaron doce procesos HTTP locales, seis procesos locales con navegador, dieciocho navegaciones productivas y observación separada de consultas, caché, SSR y chunks. [Investigación y límites](implementation-phase-9-performance-investigation.md).

El operador eliminó manualmente desde Administración → Servicios → Diagnóstico técnico la URL externa de imagen. El API productivo confirma imagen null. F9-06 permanece CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING. El alias sigue en 675b739, anterior al fallback compartido, y Home publica otros dos servicios. El smoke móvil y escritorio registró cero solicitudes a los orígenes retirados, cero ORB observado y CLS 0. Listado y ficha conservan precio, CTA y formulario. La validación del nuevo placeholder en las tres superficies depende del candidato desplegado y del servicio publicado en Home. [Evidencia productiva](phase9/f9-06-production-smoke.json).

## Aislamiento adicional F9-05

F9-05 permanece PARTIAL, clasificación H — NOT ENOUGH EVIDENCE. Se capturaron seis documentos con CDP completo y dieciocho controles HTTP simultáneos del mismo deployment 675b739. La muestra root-1-390 registró 2290.46 ms de resolución de proxy, responseStart intermedio a 2591.5 ms, cabeceras finales a 5199.1 ms y LCP 5672 ms. Su aplicación registró 1711.48 ms y API Home 825.58 ms. El residual entre timestamp de plataforma y middleware es aproximadamente 893.52 ms y requiere el detalle de inicio de función. La captura distingue Early Hints de cabeceras finales, registra la discrepancia de relojes y separa las tres fuentes de metadata de Node. El pico anterior de 9673.5 ms conserva su atribución incompleta. [Root cause isolation](implementation-phase-9-performance-investigation.md#root-cause-isolation).

## Estado vigente — posterior a PASS 27

**PASS 27 PASSED.** Se completó la remediación compatible de dependencias y su regresión local. El audit completo cambió de 3 Critical / 35 High / 32 Moderate / 11 Low a 0 / 2 / 2 / 1. El audit --prod tiene 0 Critical y 0 High. Los cinco residuales corresponden a Happy DOM de pruebas y glob/minimatch/deepmerge de build, con condiciones, aceptación técnica temporal y ausencia ejecutable documentadas. [Remediación y reporte completo](phase9-dependency-remediation.md).

La regresión de PASS 27 aprobó Prisma, lint, formato, tipos, 169 Vitest, el ensayo de base vacía con 57 integraciones adicionales, 62 E2E, 19 visuales y build. Su artefacto aprobó diez rutas SSR, payload, hidratación, JSON-LD presente, NuxtImg, WebP/AVIF, sesión y Seguridad. Los intentos de verificación se conservan en su reporte. [Gates de PASS 27](phase9/pass27-final-checks.json).

La inspección del artefacto de PASS 27 cubrió 792 archivos JavaScript y 235 source maps. Los paquetes críticos originales y los cinco residuales están excluidos del artefacto ejecutable. Schema y los SQL de 14 migraciones conservan hashes. Las bases temporales se eliminaron. El código de ese PASS se registra en b03f41b339427194bb45f1b503be57efe7f715ce. [Artefacto de PASS 27](phase9/dependency-artifact-after.json).

El cierre general de fase 9 conserva F9-05, F9-07 y la validación productiva de contenido F9-06, además de las revisiones operativas y de certificación detalladas en la matriz de PASS.

### Corrección controlada F9-06 y F9-08

El bloque completó la corrección de código y QA local. La regresión aprobó 181 Vitest, 57 integraciones adicionales de base vacía, 73 E2E, 19 visuales y build. El smoke del artefacto aprobó 18 comprobaciones de Home, servicios y ficha con tres estados de imagen en móvil y escritorio. Las cuatro capturas afectadas por el placeholder se revisaron antes de actualizarse.

| Hallazgo | Estado vigente                                               | Evidencia                                                                                                         |
| -------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| F9-06    | CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING | Fallback local verificado. Imagen null confirmada. Alias productivo anterior al candidato, smoke final pendiente. |
| F9-08    | CLOSED                                                       | Organization y WebSite SSR con datos de settings, URLs absolutas, escape e inyección probados.                    |
| F9-09    | RESOLVED INCIDENTALLY BY PASS 27                             | Cuatro DEP0155 históricos, cero en PASS 27 y en el build actual.                                                  |
| F9-05    | PARTIAL                                                      | Pico reproducido y correlacionado. Causa completa pendiente. Ver investigación F9-05.                             |
| F9-07    | OPEN                                                         | Warning pg pendiente.                                                                                             |

**Bloque PARTIAL operativo**, determinado por la validación de contenido productivo de F9-06. Código y QA locales aprobados.

[Matriz final](phase9/f9-06-f9-08-final-checks.json), [smoke SSR](phase9/f9-06-f9-08-ssr.json), [revisión visual](phase9/f9-06-visual-review.json), [exports](phase9/f9-09-exports-validation.json).

[Implementación y reproducción](implementation-phase-9-seo-image-hardening.md), [evidencia de imagen](phase9/f9-06-image-validation.json).

## Historial — estado previo a PASS 27

Este bloqueo fue resuelto posteriormente por PASS 27. Los resultados y referencias siguientes conservan el estado histórico de esa revisión.

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

## Hallazgos y prioridades con evidencia histórica

| ID    | Prioridad         | Hallazgo                                                                                                                                                                              | Siguiente comprobación                                                                                                        |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| F9-05 | P1, investigación | Primera navegación Home con TTFB 9768,6 ms y LCP 10804 ms. En la repetición, Home tuvo TTFB 397,2–458,5 ms y LCP 1492–1692 ms                                                         | Repetir muestras temporales y correlacionar request IDs con Runtime Logs y latencia DB. La causa queda pendiente de evidencia |
| F9-06 | P2                | Imagen externa de Diagnóstico técnico falla con `net::ERR_BLOCKED_BY_ORB` en catálogo y ficha de servicio                                                                             | Dato corregido manualmente. Validación productiva final del fallback y servicio en Home pendiente                             |
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

Las diez navegaciones del segundo muestreo no registraron solicitudes a Iconify remoto ni a `/api/_nuxt_icon/*`. El seguimiento de bundles queda abierto. La imagen de servicio fallida en aquel muestreo histórico limita la interpretación de su LCP. El estado vigente corresponde a la validación productiva final de F9-06. [Datos de medición](phase9/production-smoke.json).

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

| PASS  | Cobertura inicial                                                       | Trabajo restante para cierre                                                          |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 0     | Baseline, commit, versiones, PostgreSQL, deployment y SHA               | CI verificable y configuración Neon                                                   |
| 1–7   | Suites existentes y smoke público productivo                            | Matriz completa de casos, permisos por rol y operaciones productivas controladas      |
| 8–10  | Diez navegaciones, H1, overflow y snapshots existentes                  | Matriz completa responsive y revisión WCAG AA                                         |
| 11    | Mediciones productivas, build local y primer HTML en proceso nuevo      | Atribución del pico Home, chunks, INP y recursos                                      |
| 12–15 | Metadata, sitemap, robots, JSON-LD, headers, health y request IDs       | SEO completo, cookies, CSP, runtime logs y Neon                                       |
| 16–20 | Cobertura de integración/E2E existente                                  | Evidencia trazable de rollback, concurrencia, retry, handoff y errores para el cierre |
| 21–24 | Gates iniciales, visuales y bases temporales                            | CI completo del candidato final                                                       |
| 25    | Dependencia de definición comercial/legal identificada                  | PENDING BUSINESS/LEGAL INPUT                                                          |
| 26    | Dominio y canonical coincidentes con producción                         | Verificar inventario privado de variables                                             |
| 27    | PASSED, remediación y regresión completas, audit --prod 0 Critical/High | Aceptación temporal de build/pruebas documentada en PASS 27                           |
| 28    | Database review inicial, schema y 14 migraciones verificados            | Pendiente revisión completa de constraints y queries                                  |
| 29    | DB performance con muestras iniciales                                   | Pendiente auditoría específica de rendimiento de base                                 |
| 30    | Cache en memoria e invalidación funcional probados                      | Pendiente alcance completo de cache entre instancias                                  |
| 31    | Code cleanup inicial y quality gates aprobados                          | Pendiente revisión dedicada de limpieza                                               |
| 32    | Environment revisado inicialmente y configuración validada por pruebas  | Pendiente inventario privado completo de variables                                    |
| 33–36 | Runbook, informe y hallazgos priorizados                                | Resolver hallazgos y completar evidencias                                             |
| 37–40 | Criterio de cierre registrado                                           | Commit final, CI verde, deployment, smoke y decisión de cierre                        |

## CI, riesgos y estado final

El conector GitHub devolvió HTTP 404 al consultar el estado del SHA inicial. El estado real del workflow queda pendiente de evidencia accesible. El estado READY de Vercel y sus metadatos se registran por separado.

Persisten F9-05 PARTIAL, la validación productiva final de F9-06, la revisión de configuración Neon, las comprobaciones integrales de seguridad y los contenidos legales/comerciales aprobados.

Estado de certificación **NOT PRODUCTION READY**, hasta completar los criterios de aceptación de la fase 9. Esta clasificación expresa el estado de la auditoría V1. La entrega inicial deja el baseline, las evidencias y el plan de continuidad registrados.

## Final V1 Certification

Fecha local 2026-11-09, America/Guayaquil. Certificación técnica autorizada por el pass final de cierre. Las evidencias posteriores al despliegue se conservan en la rama documental `codex/v1-certification-evidence`. El candidato de aplicación es el commit de main indicado a continuación. La anotación del tag incorpora también el commit de evidencia documental.

| Control                  | Resultado                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Final SHA                | `93ea95cbb8f1ef5e3bf3fffcd3038fc0f9dbfe93`                                                                  |
| CI                       | GREEN, workflow 352296434, run 42721602694, quality 129516658063                                            |
| Deployment ID            | `dpl_FNR12PD2k1mabjrVGpQ9VHnTzHS5`                                                                          |
| Production SHA           | `93ea95cbb8f1ef5e3bf3fffcd3038fc0f9dbfe93`                                                                  |
| Vercel                   | READY, iad1, nuxtjs                                                                                         |
| Runtime                  | nodeVersion 26.x en metadata, proyecto configurado 24.x. process.version sin observación independiente      |
| Prisma                   | format --check, validate, generate y migrate status PASS                                                    |
| Schema y migraciones     | Hashes idénticos, 14 migraciones históricas, cero nuevas                                                    |
| Lint, formato, typecheck | PASS. Lint revalidado tras ordenar routeRules según la regla Nuxt                                           |
| Vitest                   | 184/184, 29 archivos                                                                                        |
| Integración DB           | 57/57 sobre base aislada                                                                                    |
| E2E                      | 74/74. El nuevo caso verifica el 404 reproducido de /login y su redirección 302 a /admin/login              |
| Visual                   | 19/19. Aviso del carrito comprobado antes de esperar su cierre. Solo referencia móvil revisada y regenerada |
| Build                    | PASS. Smoke del artefacto con seis visitas hidratadas y dos health checks                                   |
| Audit prod               | 0 Critical, 0 High, 2 Moderate, 1 Low                                                                       |
| Audit completo           | 0 Critical, 2 High, 2 Moderate, 1 Low. Aceptaciones test/build del PASS 27 vigentes                         |

[Workflow aprobado](https://github.com/ViudaNegra17/ajksolutions-ecommerce/actions/runs/42721602694). [Gates locales](phase9/v1-local-gates.json), [pasos CI](phase9/v1-ci.json), [certificación consolidada](phase9/v1-final-certification.json).

### Production smoke

Home, productos, servicios, Diagnóstico, admin/login, live, ready, robots y sitemap respondieron 200. /login devuelve 302 a /admin/login y /admin redirige a autenticación. /api/admin/products anónimo responde 401. Se completaron 12 comprobaciones HTTP, 12 visitas de navegador a 390 y 1440 px y seis entradas comerciales. Hidratación, un H1, ausencia de overflow, metadata y JSON-LD requeridos aprobaron. Cero errores JavaScript o de hidratación observados.

PHYSICAL llegó de ficha a carrito y formulario checkout. DIGITAL llegó mediante Comprar ahora a checkout directo. SERVICE presentó formulario dinámico y entrada a creación de ticket. Las comprobaciones terminaron en esos formularios. El operador confirmó manualmente “Login y panel funcionan” sobre este candidato. Las protecciones de roles y sesiones conservan cobertura de integración/E2E.

Se observaron CSP con frame-ancestors, HSTS, nosniff, Referrer-Policy y Permissions-Policy. Una respuesta de logout anónimo aislado emitió cookie con Secure, HttpOnly y SameSite=Lax. Sus valores se omitieron. La creación autenticada corresponde al flujo manual y a las pruebas existentes. Product, Service, Organization y WebSite JSON-LD son parseables. Canonical, title, description, robots y sitemap corresponden al dominio productivo. [Smoke final](phase9/v1-production-smoke.json).

### Final findings disposition

- F9-05 ACCEPTED OBSERVABILITY / PERFORMANCE RISK. Causa completa sin determinar, impacto intermitente en primera carga y sin fallo funcional, de integridad o de seguridad demostrado. Continúa en backlog V1.x.
- F9-06 CLOSED. API de Diagnóstico confirma image null. Listado y ficha muestran el placeholder compartido en móvil y escritorio, cero imágenes rotas, errores ORB, errores JS de imagen o solicitudes al origen retirado. Home NOT APPLICABLE — service not currently featured.
- F9-07 KNOWN TECHNICAL DEBT / ACCEPTED FOR V1. Warning pg/Prisma reproducible, sin fallo transaccional o de integridad demostrado.
- F9-08 CLOSED. Organization y WebSite SSR, escaping e inyección cubiertos.
- F9-09 RESOLVED INCIDENTALLY BY PASS 27.

### PASS 28–32

| PASS | Disposición y evidencia                                                                                                                                                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 28   | ACCEPTED / COMPLETE FOR V1. Las 14 migraciones y 57 integraciones cubren constraints, claves foráneas, códigos/barcode únicos, pedidos, inventario, tickets, rollback y concurrencia. Véanse tests/integration/phase2-1-integrity.test.ts, phase4-1-hardening.test.ts y final-review-phase8-5.test.ts |
| 29   | ACCEPTED FOR V1. N+1 bloqueante o query determinista multisegundo sin demostración. Comportamiento warm observado. Causa DB/Neon del pico sin probar                                                                                                                                                  |
| 30   | ACCEPTED ARCHITECTURAL LIMITATION FOR V1. HIT/MISS e invalidación administrativa probados en ui-phase7-5.spec.ts. Cache limitada a lecturas públicas. Invalidación entre instancias sin garantía                                                                                                      |
| 31   | COMPLETE. Marcadores temporales retirados, tres pruebas permanentes del contrato de logging, build sin los marcadores y cero bases de QA remanentes                                                                                                                                                   |
| 32   | COMPLETE. Las cinco variables obligatorias presentes en production. Se guardan nombres, booleanos y scope                                                                                                                                                                                             |

El ejecutor aislado de integración utiliza un worker tras contención local reproducida. Conserva los 57 casos, sus timeouts y sus escenarios internos de concurrencia. El servidor localhost:3000 fue restaurado y respondió 200.

### Known risks and business/legal

[Riesgos aceptados](v1-known-risks.md). F9-05, F9-07, cache por instancia y residuales test/build tienen disposición explícita. Business/legal conserva PENDING BUSINESS/LEGAL INPUT. La aprobación de políticas, condiciones comerciales y contenido legal corresponde al responsable del negocio.

### Final classification and version

**TECHNICALLY PRODUCTION READY — BUSINESS/LEGAL PENDING**.

**Phase 9 CLOSED técnicamente**, bajo las aceptaciones expresas del pass final. El tag anotado `v1.0.0` se crea exclusivamente sobre `93ea95cbb8f1ef5e3bf3fffcd3038fc0f9dbfe93` después de los gates, CI y smoke aprobados. Su presencia remota activa el freeze.

**V1.0.0 is the frozen functional baseline.** V1.0.x corresponde a hotfixes, V1.1.x a mejoras/performance/observabilidad, V1.2.x a funcionalidad comercial y V2.x a cambios incompatibles. El backlog V1.x incluye performance F9-05, warning F9-07, cache distribuida según escala, profiling DB, observabilidad, bundle, INP de campo, UX y mejoras comerciales.
