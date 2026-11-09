# V1 — Riesgos conocidos aceptados

Fecha de disposición 2026-11-09, America/Guayaquil. El pass final autorizó estas aceptaciones. Gates, CI y smoke productivo del candidato `93ea95cbb8f1ef5e3bf3fffcd3038fc0f9dbfe93` aprobaron.

## F9-05 — ACCEPTED OBSERVABILITY / PERFORMANCE RISK

La primera carga productiva presenta latencia intermitente. Se reprodujeron TTFB de 9673.5 ms y LCP de 12760 ms. La causa completa sigue sin determinar. La evidencia separa inicialización local, SSR, caché MISS/HIT y contribución de resolución de proxy en algunas capturas.

Una traza productiva adicional registró Start VM de 233 ms, Spawn Node.js de 219.326598 ms, Init User Code de 418.999999 ms e Invoke Function de 2214.516575 ms. Es otra petición y conserva su identidad. Sus duraciones no se sustituyen por las de los documentos capturados con CDP.

No se demostró un fallo funcional determinista, impacto en integridad de datos o impacto de seguridad atribuible al pico. DB CAUSE NOT PROVEN y NEON CAUSE NOT PROVEN. La aceptación administrativa para V1 conserva la clasificación de causa H — NOT ENOUGH EVIDENCE y no representa una corrección del rendimiento.

Seguimiento V1.x de observabilidad y performance. Revisar de nuevo ante errores funcionales, deterioro sostenido del comportamiento warm o datos de campo que cambien el impacto observado. [Investigación](implementation-phase-9-performance-investigation.md).

## F9-07 — KNOWN TECHNICAL DEBT / ACCEPTED FOR V1

La deprecación reproducible de Client.query se observa en operaciones del adaptador Prisma PostgreSQL y transacciones. Las suites existentes cubren rollback, concurrencia, retry, unicidad, reservas de inventario y creación de pedidos y tickets.

La evidencia acumulada no demuestra corrupción, pérdidas de escritura, deadlocks o regresión funcional causados por este aviso. El estado aceptado se sostiene con la regresión del candidato final. Los timeouts de preparación de pruebas se registran como incidencias de QA y no se convierten en evidencia de corrupción de datos.

Deuda técnica aceptada para V1, sin bloqueo productivo demostrado. Seguimiento V1.x de base de datos y dependencias. Reabrir ante una excepción o fallo transaccional correlacionado. Prisma, pg y su adapter conservan las versiones fijadas.

## Caché — ACCEPTED ARCHITECTURAL LIMITATION FOR V1

La caché pública reside en memoria por instancia. HIT/MISS e invalidación administrativa están cubiertos por pruebas. Auth, administración y operaciones de pedido, checkout y ticket conservan no-store.

La invalidación entre instancias no está garantizada. Esta limitación se acepta para la escala actual y se revisará en V1.x si el patrón de operación requiere consistencia compartida entre instancias. [Decisiones técnicas](technical-decisions.md).

## Dependencias de pruebas y build

El audit productivo tiene cero críticos y altos. Los dos avisos altos de Happy DOM corresponden a pruebas con fixtures controlados. Glob, minimatch y deepmerge mantienen los residuales de build documentados en PASS 27. La aceptación temporal y sus condiciones de reapertura permanecen vigentes, con revisión máxima propuesta el 2026-12-08.

La certificación final conserva el audit completo y el inventario de exclusión del artefacto. [Matriz de PASS 27](phase9-dependency-remediation.md).

## V1.x Improvement Backlog

- Profundizar la investigación de primera carga y observabilidad de campo.
- Revisar la deprecación pg/Prisma adapter.
- Evaluar caché distribuida según escala.
- Perfilar consultas avanzadas y bundles con evidencia.
- Medir INP y Core Web Vitals de usuarios reales.
- Revisar mejoras UX y comerciales en su versión correspondiente.

Estos elementos quedan fuera del cierre técnico de fase 9 cuando su aceptación se confirme en la certificación. F9-06 conserva su propio smoke final y no forma parte de esta lista de riesgos aceptados.
