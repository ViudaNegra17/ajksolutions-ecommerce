# Fase 9 — Investigación de primera carga y smoke de servicios

Fecha de revisión 2026-11-09, America/Guayaquil.

## Estado y alcance

**F9-05 PARTIAL.** El pico se reprodujo y se correlacionó por request ID. La causa completa del intervalo productivo sigue pendiente de aislamiento.

**F9-06 CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING.** El operador eliminó manualmente desde Administración → Servicios → Diagnóstico técnico la URL de imagen. El API productivo devuelve imagen null. El despliegue examinado corresponde a una versión anterior al fallback.

HEAD inicial y final de esta investigación `cd7b7b4ef8c6027941b6107244df2d9cf8a68716`. El bloque produce documentación y evidencias. Fix de aplicación aplicado, **NONE**.

[Baseline](phase9/f9-05-baseline.json), [mediciones locales](phase9/f9-05-performance.json), [muestras productivas](phase9/f9-05-production-samples.json), [correlación](phase9/f9-05-request-correlation.json), [smoke F9-06](phase9/f9-06-production-smoke.json).

## Baseline

Nuxt 4.6.3, Vue 3.5.44, Prisma CLI/Client/adapter 7.10.0, pg 8.23.0 y pnpm 11.24.0. Local Node 24.15.0 y PostgreSQL 18.3 con plpgsql. El servidor PostgreSQL local estaba activo antes de medir.

La regresión anterior registró 181 Vitest, 57 integraciones adicionales de base aislada, 73 E2E, 19 visuales y 18 comprobaciones SSR. Estos resultados pertenecen al bloque anterior y se conservan como baseline.

Producción respondió desde `dpl_MgtJxCrjWpz6eTQArZMck2GCcBU6`, SHA `675b73967d99f2c12b40fbf750a54125c0c65696`, región iad1 y Node 26.x según metadata de deployment. Los logs nuevos informan nodejs22.x y la configuración actual del proyecto indica 24.x. Esta discrepancia se documenta en Root cause isolation. La segunda consulta de metadata confirmó el mismo SHA. Las diferencias de versión, contenido, Node, infraestructura y conexión impiden tratar local y producción como un experimento A/B.

## Hallazgo histórico

La muestra original registró TTFB 9768.6 ms y LCP 10804 ms. La navegación productiva de esta revisión reprodujo TTFB 9673.5 ms y LCP 12760 ms. Por tanto, el criterio de cierre por outlier histórico irreproducible no aplica.

## Metodología

Se construyó el artefacto productivo local y se ejecutaron doce procesos nuevos para las rondas HTTP. El sondeo de arranque fue exclusivamente TCP, evitando calentar Home antes de medir. Se separaron tres secuencias, cada una con cuatro repeticiones.

- LIVE, READY, primera Home, segunda Home y tercera Home.
- Home como primera petición HTTP del proceso.
- API Home antes de solicitar HTML.

Se añadieron seis procesos locales para las navegaciones Chromium, con vistas 390×844 y 1440×900. Cada contexto realizó una primera navegación y una repetición. Producción cuenta con doce navegaciones iniciales y seis controles adicionales repartidos en tres procesos Chromium nuevos.

Proceso nuevo significa estado de aplicación recién iniciado. El estado de caché del sistema operativo y PostgreSQL ya activo permaneció fuera del control experimental. Un contexto o proceso Chromium nuevo tampoco demuestra una función Vercel fría.

El cliente HTTP registró fecha, DNS cuando aplica, conexión, TLS, TTFB, total, bytes, status, IDs y headers de caché. Chromium registró Navigation Timing, FCP, LCP, CLS, carga, DOMContentLoaded, long tasks, recursos y la señal DOM de hidratación de la aplicación. Esta última es un marcador observado tras la mutación y puede incluir demora del observador. INP permanece sin muestra por falta de una secuencia suficiente de interacción.

Las mediciones Chromium adicionales incluyen CDP Network ResourceTiming y protocolo. El primer pico se capturó antes de añadir esos campos, por lo que carece de ese desglose CDP.

## Primera carga local HTTP

Los rangos corresponden a TTFB en milisegundos.

| Secuencia                  | Procesos | Primera Home  | Segunda y tercera Home |
| -------------------------- | -------- | ------------- | ---------------------- |
| LIVE y READY antes de Home | 4        | 868.0–1504.2  | 58.1–145.9             |
| Home primero               | 4        | 1276.4–2325.5 | 59.5–106.7             |
| API Home antes del HTML    | 4        | 547.7–1125.5  | 57.8–96.0              |

El tiempo desde creación del proceso hasta escuchar TCP fue 723.2–1541.2 ms. LIVE inicial estuvo aproximadamente entre 28 y 41 ms y READY entre 225 y 423 ms en las rondas estándar. READY incluye el primer acceso de salud a la base. Comparar ambas rutas muestra trabajo adicional al usar la base, pero sus duraciones también incluyen inicialización del cliente y aplicación.

En los procesos con API primero, el primer MISS del API Home tardó aproximadamente 515–638 ms y los HIT posteriores 6–15 ms. Las respuestas HTTP y sus IDs individuales quedan en la evidencia local.

## Navegador local

| Estado                                    | Muestras | TTFB ms       | LCP ms    | Hidratación observada ms | CLS |
| ----------------------------------------- | -------- | ------------- | --------- | ------------------------ | --- |
| Proceso servidor nuevo                    | 6        | 1240.6–3015.2 | 1680–3448 | 1863.4–3726.5            | 0   |
| Repetición en el mismo proceso y contexto | 6        | 82.4–174.8    | 196–348   | 305.5–477.8              | 0   |

Las muestras warm cumplen las referencias de TTFB menor de 800 ms, LCP menor de 2500 ms y CLS menor de 0.1. Dos primeras navegaciones locales superaron la referencia de LCP warm y se conservan separadas.

## Instrumentación de API y consultas

Se instrumentó una copia desechable de `.output`, en `logs/f905/instrumented`. Se reutilizó el logger estructurado compilado con campos permitidos de tiempos, operación e ID. Se activó la observación de eventos query exclusivamente en el cliente compilado de esa copia. Se guardaron tablas, duración y fingerprint, excluyendo texto SQL y parámetros. La copia se retiró al finalizar.

Los resultados observados tienen overhead de instrumentación. La duración del evento query incluye trabajo del cliente, adapter y posibles colas. No equivale a tiempo aislado de ejecución dentro del backend PostgreSQL.

Tres procesos con API Home primero registraron un total interno MISS de 544.2–564.4 ms y ocho eventos query por petición. Los HIT inmediatos registraron cero queries y 1.2–1.8 ms dentro del handler observado. El TTFB incorpora capas adicionales del servidor.

Ejemplo correlacionado con `ec44cdf5-b02b-4f3b-b4bb-8934fbf355ec`.

| Operación                                | Duración ms |
| ---------------------------------------- | ----------- |
| Catálogo, actualmente settings públicos  | 456.2       |
| Settings públicos                        | 455.9       |
| Servicios y settings de precio           | 541.0       |
| Consulta de servicios y categoría        | 520.7       |
| Settings de precio                       | 540.0       |
| Banner HOME_HERO                         | 427.5       |
| Banner HOME_SECONDARY                    | 428.7       |
| Límite temporal de banners y promociones | 549.6       |
| Total API observado                      | 558.0       |

Las operaciones se solapan. Sus duraciones no se suman para calcular el total. El camino más largo del ejemplo es el cálculo del límite temporal, seguido de servicios.

Los ocho eventos corresponden a dos lecturas de settings, servicios y su categoría, dos placements de banner y dos consultas de límites temporales de banners y promociones. Las dos consultas de banners de placements comparten fingerprint SQL y usan placements diferentes según el código inspeccionado. Los settings públicos y los de precio tienen alcance y fingerprints diferentes.

El API Home actual no consulta productos destacados. Las categorías del encabezado se consultan desde otro endpoint durante SSR. La consulta relacionada de categorías de servicio se hace para el conjunto recuperado. Estas muestras no demostraron N+1 ni repetición idéntica de todo el catálogo.

## Conexión a base de datos

Cinco conexiones nuevas directas al PostgreSQL local registraron 42.3–59.5 ms para conectar. El primer SELECT 1 tardó 0.77–2.23 ms y los siguientes 0.21–0.38 ms.

Este ensayo aísla conexión y query en un cliente pg directo. Su comparación con Prisma tiene límites por el trabajo adicional del adapter y la inicialización. La evidencia productiva disponible carece de tiempos separados de conexión y backend query para el request lento.

**NEON CAUSE NOT PROVEN.** No se obtuvo telemetría de suspend/resume, apertura de conexión o compute que permita asignar el pico a Neon.

## Caché

La clave observada para Home fue `home:0:188400dc6a03b12f5e4fea501212295151a4a42b6dc4ed417c1680475552f4a7`.

Se verificó MISS inicial, HIT posterior y cero consultas en HIT. Después de 61 segundos sin solicitudes se obtuvo un nuevo MISS con ocho queries. Su handler observado tardó 270.8 ms, con TTFB 281.1 ms. El HIT siguiente tardó 0.615 ms dentro del handler y 9.7 ms de TTFB.

El MISS con cliente inicializado fue menor que los MISS de procesos nuevos. El caché explica una parte medible de la diferencia, y la inicialización añade otra. Este resultado corresponde al entorno local.

En producción se observó X-Public-Cache HIT en el API Home. X-Vercel-Cache MISS del HTML describe otra capa y no demuestra MISS del caché de datos usado internamente por SSR.

## SSR

Tres procesos nuevos de la copia instrumentada separaron dos intervalos inclusivos.

| Intervalo                                   | Primera Home ms | Repetición ms |
| ------------------------------------------- | --------------- | ------------- |
| Obtención e inicialización del renderizador | 74.4–433.5      | 0.020–0.028   |
| renderToString                              | 990.1–1623.8    | 67.3–143.2    |

renderToString incluye los fetch de datos y la renderización. La instrumentación permite distinguir la inicialización del renderizador y el intervalo SSR, pero no atribuir todo renderToString a CPU de Vue. Los spans de API están contenidos en ese intervalo y pueden ejecutarse en paralelo.

Las muestras HTTP originales y las instrumentadas están identificadas por separado en el JSON.

## Producción

La primera ronda HTTP nativa registró TTFB 1643.7 ms y total 1688.6 ms para Home. Las dos siguientes registraron 302.3 y 239.1 ms. La ronda final registró Home entre 165.4 y 282.6 ms, LIVE 486.8 ms y READY 207.6 ms. Sus estados de función fría no están controlados.

| Navegación Chromium                                    | Muestras | TTFB ms     | LCP ms   | CLS |
| ------------------------------------------------------ | -------- | ----------- | -------- | --- |
| Pico inicial                                           | 1        | 9673.5      | 12760    | 0   |
| Otras primeras navegaciones del primer lote            | 5        | 265.4–366.6 | 744–1060 | 0   |
| Repeticiones del primer lote                           | 6        | 87.6–129.9  | 388–580  | 0   |
| Primeras navegaciones en tres procesos Chromium nuevos | 3        | 318.0–582.9 | 880–3888 | 0   |
| Repeticiones de esos controles                         | 3        | 93.5–98.1   | 340–500  | 0   |

Un control adicional obtuvo TTFB 582.9 ms y LCP 3888 ms. CDP registró receiveHeadersStart 580.7 ms y receiveHeadersEnd 3143.5 ms, con HTTP/2. Esto demuestra que un TTFB bajo puede coexistir con una demora posterior de la navegación. La causa de ese intervalo de transporte no queda aislada por esos dos campos.

El cliente Chromium reportó actividad de proxy en los controles. Esa observación limita la extrapolación a navegadores reales de clientes. El pico original carece de esos campos para confirmar si siguió el mismo patrón.

## Correlación obligatoria del pico

Request ID de aplicación `cc923c96-2bf4-43f0-947d-644cd5d958e3`.

ID de plataforma `fkwh7-1794226285085-6d4854b8323e`.

- Inicio de navegación registrado por el cliente, 2026-11-09T12:11:15.376Z.
- Registro de request de plataforma, 2026-11-09T12:11:25.085Z.
- Fin registrado por la aplicación, 2026-11-09T12:11:27.741Z.
- Duración registrada por el middleware de aplicación, 1663.48 ms.
- API Home dentro de la misma invocación, 873.86 ms.
- Settings públicos, 834 ms.
- Categorías, 735.25 ms.
- TTFB observado por Chromium, 9673.5 ms.
- Intervalo responseStart a responseEnd de navegación, 2667.7 ms.
- LCP, 12760 ms.

Los relojes y límites de medición del cliente, edge y middleware describen eventos distintos. La duración del middleware cubre parte de la petición, y carece de la inicialización anterior al middleware y del transporte completo. Restarla del TTFB no identifica automáticamente el resto como red, Vercel o base de datos.

Los logs unen los IDs de aplicación y plataforma y permiten atribuir los tres endpoints de datos a la misma invocación. Los intervalos de datos son concurrentes. La telemetría disponible no ofrece los subspans productivos de consultas ni el desglose de inicialización de esa función.

También se correlacionó la primera petición HTTP nativa `0673d080-70f9-48d0-acd5-fd2e4c586d0a`, con TTFB 1643.7 ms y duración de aplicación 1204.41 ms.

## Elemento LCP y transferencia

En el pico, el LCP fue `IMG.home-hero__asset`, 356×267, imagen WebP de 448 px, loading eager y fetchpriority high.

El recurso comenzó a 12351.7 ms, terminó a 12640 ms y tardó aproximadamente 288.3 ms. Registró 27802 bytes de cuerpo codificado y 28102 bytes transferidos. La hidratación observada terminó a 13236.9 ms.

El recurso se solicitó después del intervalo de respuesta inicial. Sus 288 ms de descarga no explican el TTFB anterior de 9.67 s. La composición del Hero conserva la validación de las fases anteriores.

## Chunks administrativos

Una navegación local separada utilizó cobertura precisa de JavaScript y el manifiesto del candidato. Se solicitó el chunk de `layouts/admin.vue`, archivo `YCkEYkd-.js`, con 117689 bytes transferidos y 47.5 ms de duración. Resource Timing lo marcó non-blocking y la cobertura no registró ejecución para ese recurso.

El hallazgo observado corresponde a descarga del layout administrativo. No se observaron solicitudes de entradas de páginas admin en esa navegación. Los chunks compartidos requieren interpretar su contenido por separado y la cobertura mide exclusivamente la ventana capturada.

La auditoría está vinculada a los hashes locales. El manifiesto local no permite asignar nombres de origen a todos los hashes del despliegue productivo anterior. El impacto causal sobre el pico productivo sigue sin demostración.

## Clasificación de causa y cierre

Se demostraron componentes C y E en local, inicialización y SSR, además de una diferencia sustancial entre MISS y HIT. En Chromium productivo se midió una demora posterior a responseStart en algunos casos, compatible con investigar el componente F de entrega al navegador.

La clasificación vigente del pico completo es **H — NOT ENOUGH EVIDENCE**. La categoría G sería una hipótesis hasta separar los intervalos faltantes. A y B tampoco están probadas. El criterio de cierre como outlier histórico irreproducible queda descartado porque el pico se reprodujo.

**F9-05 PARTIAL.** Para cerrar se necesita capturar un nuevo request lento con CDP completo y observabilidad del ciclo de inicialización de función y sus suboperaciones de datos en el mismo candidato. El criterio exige causa demostrada, cambio mínimo si corresponde y validación posterior. Las muestras warm rápidas, por sí solas, no cumplen ese cierre.

## Smoke F9-06

El API productivo confirma imagen null después de la eliminación manual. Se revisaron Home, listado y ficha en móvil y escritorio. Se registraron cero solicitudes a los orígenes retirados, cero errores ORB observados, cero imágenes rotas y cero errores JS. CLS fue 0.

En listado y ficha siguen visibles precio y CTA. La ficha conserva el formulario. El CTA se comprobó navegando a la ficha y verificando el formulario visible, sin enviar solicitudes comerciales.

El listado productivo usa el placeholder antiguo. La ficha carece del nuevo placeholder técnico compartido. Home publica únicamente desarrollo-software-a-medida e isp-en-memorias-emmc-y-ufs y no incluye Diagnóstico técnico. Por ello, la comprobación del placeholder de ese servicio en Home queda pendiente de la selección comercial publicada y de verificar el candidato que contiene el fallback.

La validación local del candidato se registra aparte en el JSON. El estado productivo permanece **CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING**.

## Cambios y regresión

Fix aplicado, **NONE**. La investigación utiliza GET públicos, SELECT 1 y observación local temporal. Las decisiones de diagnóstico y sus límites están detallados arriba.

El build nuevo del candidato aprobó, con duración aproximada de 80.35 s. Los hashes del schema, los catorce SQL de migración y el módulo Nitro original se verificaron al finalizar. Las comprobaciones Prisma de este bloque se registran en la evidencia de verificación final.

Las suites de 181 Vitest, 57 integraciones aisladas, 73 E2E, 19 visuales y 18 SSR son el baseline anterior. No se presentan como una nueva ejecución. El requerimiento de regresión completa del prompt está condicionado a cambios de código de aplicación. Este bloque contiene documentación y evidencias.

## Root cause isolation

Revisión adicional F9-05 del 2026-11-09. Clasificación vigente **H — NOT ENOUGH EVIDENCE**. Estado **PARTIAL**. Fix required **UNKNOWN**.

### Candidatos y baseline del bloque

El candidato local sigue en `cd7b7b4ef8c6027941b6107244df2d9cf8a68716`. La investigación anterior dejó documentación y evidencias pendientes en el working tree. Este bloque conserva ese trabajo y lo registra en su baseline.

Producción sigue en SHA `675b73967d99f2c12b40fbf750a54125c0c65696`, deployment `dpl_MgtJxCrjWpz6eTQArZMck2GCcBU6`, región iad1. Los tres lotes se verificaron contra el mismo deployment antes de medir. Se capturaron seis navegaciones Chromium y dieciocho controles HTTP simultáneos en tres momentos, separados aproximadamente por 65 segundos entre lotes.

Node local 24.15.0, Nuxt 4.6.3, Vue 3.5.44, Prisma CLI/Client/adapter 7.10.0, pg 8.23.0 y Nitro 2.13.6. La metadata del deployment informa Node 26.x, la configuración actual del proyecto informa 24.x y los registros de runtime de las seis invocaciones indican nodejs22.x. Estos campos se conservan por separado. Falta una marca process.version de la función para resolver esa discrepancia y confirmar la versión efectiva del proceso.

[Baseline del aislamiento](phase9/f9-05-root-cause-baseline.json), [muestras](phase9/f9-05-root-cause-samples.json), [CDP](phase9/f9-05-cdp-correlation.json), [runtime](phase9/f9-05-runtime-correlation.json).

### Captura completa y control HTTP simultáneo

Chromium registró requestWillBeSent, responseReceived, responseReceivedExtraInfo, responseReceivedEarlyHints, dataReceived y loadingFinished para el documento. La evidencia incluye IDs de navegación y conexión, protocolo, IP remota, cachés de disco/service worker/prefetch, Navigation Timing completo, LCP y CLS.

Los headers se limitaron a request IDs, caché, Server-Timing, encoding, longitud, tipo y Date. Las filas conservan la identidad del deployment. El intervalo reportado como responseIntervalMs abarca responseStart a responseEnd y se desglosa respecto a las cabeceras finales.

Los controles HTTP nativos comenzaron en paralelo y continuaron después de cada navegación. Esa simultaneidad puede calentar una instancia o sus datos y limita cualquier afirmación de cold start. La CLI y las marcas de caché se usaron como observación, sin forzar un estado frío de plataforma.

### Muestra lenta nueva

Navegación `root-1-390`, viewport 390×844. App request ID `146a2596-f98b-489b-bcd7-52ecfc53b948`. Platform request ID `9kw96-1794232789859-1d16a2b1a38b`.

| Fase del navegador                               | Inicio o duración ms desde navigationStart |
| ------------------------------------------------ | ------------------------------------------ |
| Resolución de proxy, duración CDP                | 2290.46                                    |
| DNS, duración                                    | 5.5                                        |
| Conexión incluida negociación TLS, duración      | 198.0                                      |
| requestStart                                     | 2498.4                                     |
| responseStart y firstInterimResponseStart        | 2591.5                                     |
| finalResponseHeadersStart                        | 5199.1                                     |
| responseEnd                                      | 5205.6                                     |
| Primeras cabeceras a cabeceras finales, duración | 2607.6                                     |
| Cabeceras finales a responseEnd, duración        | 6.5                                        |
| FCP y LCP                                        | 5672                                       |
| responseEnd a LCP, duración                      | 466.4                                      |
| CLS                                              | 0                                          |

CDP registró HTTP/2, conexión nueva, remoteIPAddress 64.29.17.131 y remotePort 443. fromDiskCache, fromServiceWorker y fromPrefetchCache fueron false. La resolución de proxy precedió al DNS y al envío del request. Esa duración pertenece a la fase de resolución de proxy del navegador y no identifica por sí sola el software o servicio que la produjo.

La misma captura contiene el evento responseReceivedEarlyHints. responseStart coincide con firstInterimResponseStart y las cabeceras finales aparecen unos 2.61 s después. El intervalo responseStart a responseEnd de 2614.1 ms incluye la espera entre respuesta intermedia y final. La finalización posterior a las cabeceras finales fue 6.5 ms. La separación de respuestas intermedias y finales está definida por Resource Timing y el protocolo CDP identifica el evento de Early Hints. [W3C Resource Timing](https://www.w3.org/TR/resource-timing/), [Chrome DevTools Network](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Network.pdl).

Esto precisa la interpretación de la investigación anterior. El campo responseStart utilizado como TTFB puede señalar una respuesta intermedia. El intervalo restante hasta responseEnd requiere desglosar espera de cabeceras finales y finalización de respuesta antes de asignarlo a descarga del cuerpo o a un stall HTTP/2.

### Correlación de plataforma y aplicación

| Reloj del registro | Evento                           | Timestamp UTC            |
| ------------------ | -------------------------------- | ------------------------ |
| Cliente/CDP        | navigationStart                  | 2026-11-09T13:59:56.857Z |
| Cliente/CDP        | responseStart                    | 2026-11-09T13:59:59.448Z |
| Cliente/CDP        | Cabeceras finales completas, CDP | 2026-11-09T14:00:02.056Z |
| Cliente/CDP        | responseEnd                      | 2026-11-09T14:00:02.062Z |
| Plataforma         | Request timestamp                | 2026-11-09T13:59:49.859Z |
| Aplicación         | Inicio de middleware inferido    | 2026-11-09T13:59:50.752Z |
| Aplicación         | Fin del middleware registrado    | 2026-11-09T13:59:52.464Z |
| API Home           | Inicio inferido                  | 2026-11-09T13:59:51.281Z |
| API Home           | Fin registrado                   | 2026-11-09T13:59:52.107Z |

Los relojes del cliente y los registros remotos presentan una diferencia evidente en esta captura. Los timestamps absolutos quedan como evidencia original y no deben restarse entre dominios de reloj para calcular latencia. Dentro de Chromium se usan duraciones monotónicas. Dentro de los logs se usa el ID exacto y sus intervalos registrados.

El registro de request productivo a fin de aplicación abarca aproximadamente 2605 ms. El middleware registró 1711.48 ms. El residual aritmético es 893.52 ms, anterior al intervalo del middleware según esas marcas. Es una medida compuesta y aproximada, dependiente del significado del timestamp de plataforma y de la alineación de sus relojes. Faltan spans para repartirlo entre cola, arranque de función, imports, Nitro u otro trabajo anterior al middleware.

La espera observada entre la respuesta intermedia y las cabeceras finales fue 2607.6 ms. Es compatible en duración con los 2605 ms del recorrido remoto registrado, pero esa coincidencia no sustituye una calibración de relojes ni un span de inicialización.

### API, DB y SSR productivos

Para la misma invocación, el middleware registró los siguientes intervalos inclusivos.

| Ruta                      | Duración ms |
| ------------------------- | ----------- |
| Home HTML                 | 1711.48     |
| API Home                  | 825.58      |
| Settings públicos         | 620.59      |
| Categorías del encabezado | 682.03      |

Los endpoints de datos se solapan. Sus inicios son inferidos del timestamp final menos durationMs, con la precisión de esos logs. La captura enlaza los IDs internos de aplicación con el mismo ID de plataforma.

La producción vigente carece de spans publicados para las suboperaciones de Home, query count, estado de conexión, caché interna del API usado por SSR, primera operación DB y renderToString. Su ausencia se registra explícitamente como telemetría no disponible. El header X-Vercel-Cache MISS del documento corresponde a la capa de Vercel.

Dos GET adicionales e independientes al API Home capturaron X-Public-Cache MISS con TTFB 2198.4 ms y HIT con 129.9 ms. X-Vercel-Cache fue MISS en ambos. La correlación de logs del MISS registró 769.42 ms dentro del middleware del API, frente a 4.6 ms en el HIT. El request de plataforma del MISS se registró a 14:12:53.062Z y el inicio inferido de middleware a 14:12:54.042Z, dejando aproximadamente 980.58 ms de residual anterior al middleware. Ese residual compuesto sigue sin un span directo de inicialización. Estas peticiones tienen IDs propios y no establecen el estado de caché de la invocación SSR anterior.

**DB CAUSE NOT PROVEN. NEON CAUSE NOT PROVEN.** La revisión no obtuvo spans de conexión ni eventos de compute wake para esas peticiones. La conexión local y sus queries, medidas en el bloque anterior, mantienen su alcance local.

### Resultados de los controles

| Navegación  | TTFB hasta primera respuesta ms | Cabeceras finales ms | LCP ms | Aplicación ms | API Home ms |
| ----------- | ------------------------------- | -------------------- | ------ | ------------- | ----------- |
| root-1-390  | 2591.5                          | 5199.1               | 5672   | 1711.48       | 825.58      |
| root-1-1440 | 289.5                           | 386.6                | 892    | 72.18         | 19.10       |
| root-2-390  | 301.8                           | 771.8                | 1268   | 376.82        | 263.28      |
| root-2-1440 | 283.9                           | 407.5                | 896    | 88.04         | 23.61       |
| root-3-390  | 308.9                           | 624.7                | 1036   | 251.58        | 213.22      |
| root-3-1440 | 286.0                           | 370.3                | 804    | 54.36         | 15.66       |

Los seis documentos recibieron Early Hints. Todos registraron CLS 0. El primer control HTTP nativo simultáneo tardó 2983.1 ms hasta las cabeceras finales y registró 1620.63 ms en la aplicación. Los restantes controles nativos tardaron 165.1–618.1 ms. La primera respuesta de Chromium y las cabeceras finales del cliente HTTP representan hitos diferentes y se comparan con esa distinción.

El pico anterior de 9673.5 ms hasta responseStart no volvió a capturarse en estos seis documentos. La nueva muestra de 5.20 s hasta las cabeceras finales permite demostrar un componente de resolución de proxy de 2.29 s y segmentar el recorrido remoto, pero no permite asignar retrospectivamente los aproximadamente ocho segundos del pico anterior a la misma fase.

### Arranque anterior al middleware en la copia local

Tres procesos nuevos del candidato se ejecutaron con las secuencias Home primero, API primero y READY antes de Home. Un launcher temporal creó marcas monotónicas antes del import dinámico del entrypoint. La copia registró imports hasta evaluación del cuerpo de Nitro, construcción del cliente, creación de Nitro, plugins, escucha TCP, entrada HTTP, middleware, renderizador, SSR y límites de operaciones de datos.

| Intervalo observado                                 | Rango ms     |
| --------------------------------------------------- | ------------ |
| Import del entrypoint a evaluación del cuerpo Nitro | 869.5–1067.8 |
| Construcción observada de adapter/cliente           | 46.8–68.7    |
| createNitroApp                                      | 3.8–18.6     |
| Ejecución síncrona de plugins                       | 0.95–1.64    |
| Entrada del primer request a middleware             | 4.48–6.41    |
| Inicialización del primer renderizador SSR          | 118.1–265.4  |
| Primer renderToString, inclusivo de datos           | 599.4–1095.7 |

El import dinámico a cuerpo de Nitro incluye resolución, carga y evaluación de dependencias estáticas y el overhead diagnóstico. El marcador del launcher ocurre a los aproximadamente 40 ms de vida del proceso. processTimeOrigin permite ubicar el inicio estimado y las marcas posteriores usan performance.now. Los tiempos de la copia local no se asignan a la función productiva antigua.

La primera frontera de operación de datos de Home se capturó en settings.public.start. En Home primero apareció 575.2 ms después del primer middleware. El primer evento query observado terminó aproximadamente a 2201.4 ms de vida del proceso, dentro de la ruta de categorías. Esa frontera de negocio y la finalización de query no equivalen a un span de establecimiento de conexión.

En el escenario READY primero, la primera query de salud carece de correlación de request dentro del observador de handlers cacheados. Se conserva como un evento no correlacionado y no se asigna artificialmente al API Home.

El API Home observado en la copia ejecutó ocho queries en MISS y cero en HIT. Los totales internos MISS fueron 534.7–682.3 ms. Los HIT inmediatos quedaron en 0.66–1.52 ms, y el HIT utilizado durante el primer SSR con API previamente caliente registró 15.5 ms con cero queries. Las suboperaciones, fingerprints, caché y datos de encabezado permanecen en el JSON con sus IDs.

### Límites y clasificación

La confianza es alta en los intervalos medidos dentro de cada dominio de reloj y en la correlación de IDs. La confianza en la causa completa del pico de 9673.5 ms sigue siendo insuficiente.

La clasificación final de este bloque es exclusivamente **H — NOT ENOUGH EVIDENCE**. Los componentes nuevos medidos no se convierten en una clasificación G del hallazgo completo. El detalle de inicio de función, sus suboperaciones productivas y una nueva captura del pico completo con CDP son los límites principales.

La CLI permitió recuperar logs de requests y aplicación. El acceso visual al panel falló por CryptUnprotectData 2148073483 en ambas herramientas de control disponibles. Se solicitó al operador el detalle del request 9kw96 para consultar Start Type, Function Init y duración de invocación. La documentación de Vercel describe esos detalles de ejecución en Logs. [Runtime Logs](https://vercel.com/docs/logs/runtime#log-details).

La acción siguiente es revisar ese detalle y obtener una captura completa del pico con la telemetría que falta. Una optimización requiere identificar primero la operación causante. **Fix required UNKNOWN. F9-05 PARTIAL.**

### F9-06 y verificación del bloque

Se observaron únicamente listado y ficha de Diagnóstico técnico en móvil y escritorio. El API devolvió image null. Las cuatro navegaciones registraron cero ORB, cero imágenes rotas y cero solicitudes a los orígenes retirados. El nuevo placeholder compartido sigue pendiente del candidato desplegado. Esta observación conserva el estado operativo de F9-06.

El bloque entrega documentación, captura CDP, correlación de runtime y mediciones temporales. La copia desechable se retiró. El schema, los catorce SQL de migración y el entrypoint y módulo Nitro originales conservaron sus hashes. La evidencia incluye la verificación de integridad y el inventario de cambios. La regresión completa anterior conserva su identificación de baseline.

Continúan pendientes F9-07, PASS 28–32, CI final, deployment del candidato y smoke final.

## Pendientes de fase 9

| Elemento         | Estado                                                                            |
| ---------------- | --------------------------------------------------------------------------------- |
| F9-05            | PARTIAL, pico reproducido y correlacionado, causa incompleta                      |
| F9-06            | Dato corregido, smoke productivo final pendiente del candidato y servicio en Home |
| F9-07            | Pendiente, warning pg fuera del alcance de este bloque                            |
| PASS 28–32       | Pendientes según la matriz del informe general                                    |
| CI final         | Pendiente de la revisión final                                                    |
| Deploy           | Alias examinado sigue en 675b739, anterior al candidato                           |
| Smoke final      | Requiere verificar el candidato realmente desplegado                              |
| Business y legal | Validaciones operativas y comerciales del informe general pendientes              |

El bloque termina con la evidencia y estos estados para revisión.
