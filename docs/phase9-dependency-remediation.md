# Fase 9 — PASS 27 — Auditoría y remediación de dependencias

Fecha 2026-11-08, America/Guayaquil.

## Baseline antes de cambios

HEAD `675b73967d99f2c12b40fbf750a54125c0c65696`, rama `main`, árbol limpio. Node 24.15.0, pnpm 11.24.0. Nuxt 4.5.2, Vue 3.5.40, Nuxt UI 4.11.0, Prisma CLI/Client/adapter 7.10.0, Zod 4.4.3, pg 8.23.0, @nuxt/image 2.1.0 y @nuxt/icon 2.5.1.

Audit inicial, 3 críticos, 35 altos, 32 moderados y 11 bajos en 81 registros. Los números describen avisos del árbol instalado. Cada aviso se atribuye por paquete, versión, ruta, condición y evidencia de artefacto.

[Audit inicial](phase9/dependencies-before.json), [inventario y hashes](phase9/dependency-baseline.json), [clasificación individual](phase9/dependency-classification-before.json), [artefacto previo](phase9/dependency-artifact-before.json).

Las 14 migraciones y schema tienen hashes registrados. Baseline de calidad, 169 Vitest, 62 E2E, 19 visuales, build y 368 comprobaciones responsive aprobadas.

## Clasificación de exposición

A identifica runtime explotable demostrado. B indica presencia runtime con explotabilidad pendiente de demostración. C corresponde a build. D corresponde a desarrollo/pruebas. E exige condiciones ausentes en el uso actual. F se reserva para avisos duplicados, falsos o superados con evidencia.

La clasificación individual contiene los 81 GHSA, versiones resueltas y rutas completas obtenidas con pnpm why y audit. Se utiliza B de forma conservadora para SSR, validación y procesamiento de imágenes, y se prioriza corregir esos paquetes.

DevTools depende de la opción explícita `NUXT_DEVTOOLS=true` y la condición de entorno impide su activación productiva. La inspección previa encontró los tres paquetes críticos ausentes del manifiesto y directorios ejecutables de .output. La mención de launch-editor en metadata de desarrollo de nostics y strings del binario libvips se registran por separado.

Los tres críticos requieren entrada no confiable en operaciones Git/editor/shell. Sus condiciones están descritas en los avisos primarios. [argv-parser](https://github.com/advisories/GHSA-v5rq-49vh-5v5c), [simple-git](https://github.com/advisories/GHSA-x6jw-m9v5-85vh), [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

## Plan previo a editar package.json y lockfile

### MUST FIX

Actualizar Nuxt a 4.6.3 para corregir los advisories de su familia, incluido el acceso al bundle Nitro dev. La release exige Vue ^3.5.44 y Node ^24.15.0, satisfecho por la versión local. Se actualizará Vue conjuntamente a 3.5.44, incluido el override Vue preexistente, para alinear renderer, runtime y compiladores.

El mínimo patch corregido del renderer es 3.5.42. Se elige 3.5.44 por el requisito upstream de Nuxt 4.6.3. Nuxt UI 4.11.0 declara compatibilidad con Vue Router 4/5 y Zod 4. Nitro conserva su familia 2 mediante el adapter oficial predeterminado.

Nuxt 4.6.3 incorpora sus dependencias upstream CLI 4, devalue ^6.0.3, Vite ^8.3.5 y DevTools ^3.4.4. Esos cambios transitivos forman parte del análisis de riesgo de la corrección Nuxt. Se utilizarán sus rangos declarados y regresión SSR completa. [Release 4.6.3](https://github.com/nuxt/nuxt/releases/tag/v4.6.3), [notas de compatibilidad 4.6.0](https://github.com/nuxt/nuxt/releases/tag/v4.6.0), [renderer](https://github.com/advisories/GHSA-g2v6-rqmx-r4w6).

Actualizar Zod a 4.6.6 por su advisory directo de consumo de memoria en colecciones. Resolver sharp corregido dentro del rango ^0.35.3 declarado por IPX. Conservar @nuxt/image 2.1.0 y validar transformaciones y NuxtImg.

### SHOULD FIX

Actualizar transitivas señaladas sólo dentro de sus rangos existentes, source-map-js, prosemirror-view, node-forge, fast-uri, brace-expansion, serialize-javascript y SDK MCP del inspector. Devalue, seroval, undici, DevTools y Vite se resolverán mediante Nuxt corregido y se comprobarán después.

Actualizar Vitest y coverage juntos de 4.1.11 a 4.1.12 por @vitest/mocker. Happy DOM podrá avanzar a 20.14.6 para el aviso con corrección compatible en 20.x.

### DEV-ONLY / MITIGATED

Los avisos Happy DOM que exigen 21.x se atribuyen al entorno de pruebas con fixtures controlados. La aplicación productiva no usa ese DOM. Evaluar residuales después del cambio compatible en 20.x. Las dependencias de globs/build cuyos parches exigen nuevas majors se mantendrán sólo con prueba de exclusión runtime y entradas de configuración confiables.

### NO ACTION

Prisma permanece 7.10.0 alineado en sus tres paquetes. Nuxt UI, Reka, pg, Pinia, auth-utils, icon e image conservan las versiones directas actuales. Los cambios quedan limitados a dependencias, evidencias y la adaptación mínima de regresión que resulte demostrada.

### Matriz de paquetes antes de cambios

La tabla siguiente fue generada antes de modificar dependencias. Las rutas y GHSA completos se encuentran en el JSON individual.

| Paquete                      | Actual resuelto | Advisory                                                                                                                                                                                                                                                   | Exposición | Fixed                                                   | Cambio propuesto                                     | Riesgo                            |
| ---------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| fast-uri                     | 3.1.7           | GHSA-hrr3-gc8f-f4qj, GHSA-w74x-v6f9-j3xg, GHSA-xhq7-xmqj-769h, GHSA-wjr9-j795-jxcr, GHSA-333x-w4r6-6crp                                                                                                                                                    | D          | >=3.1.8, >=3.1.9                                        | resolver patch/minor compatible en su rango upstream | bajo a medio, tooling y regresión |
| brace-expansion              | 2.1.4, 5.0.9    | GHSA-q2hr-2g5m-vwhr, GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p, GHSA-6j4f-fj2g-mc7p                                                                                                                               | C          | >=2.1.7, >=5.0.12, >=2.1.6, >=5.0.11, >=2.1.5, >=5.0.10 | resolver patch/minor compatible en su rango upstream | bajo a medio, tooling y regresión |
| serialize-javascript         | 7.1.1           | GHSA-gfhx-hw2g-v5hg, GHSA-m5mm-p8h7-m29v                                                                                                                                                                                                                   | C          | >=7.1.2, >=7.1.3                                        | resolver patch/minor compatible en su rango upstream | bajo a medio, tooling y regresión |
| devalue                      | 5.9.2           | GHSA-j22f-vq7h-c4qm, GHSA-hx4r-w6wj-j8fg, GHSA-mcm9-63f2-9j32, GHSA-wf3x-273g-mvxv, GHSA-x5rw-q4pp-hg5g, GHSA-4q55-j62x-fr9h, GHSA-r9w8-h9r3-54w4                                                                                                          | B          | >=5.9.3                                                 | ^6.0.3 declarado por Nuxt 4.6.3                      | medio, SSR/APIs/imágenes          |
| node-forge                   | 1.4.0           | GHSA-86w9-cpqp-85rv, GHSA-4642-5mcj-2rqw, GHSA-6wvx-3r32-xmcg, GHSA-525v-9gp9-w22h, GHSA-7wch-p9px-956x, GHSA-h6cr-wjv9-3cpp, GHSA-4487-j8r4-4g2f, GHSA-5cwg-6vw7-rj6p, GHSA-jc66-7q78-782g, GHSA-8hrf-8g6f-7xwp, GHSA-hqq3-7jhf-c5jx, GHSA-5x38-2vff-x55p | D          | >=1.4.1                                                 | resolver patch/minor compatible en su rango upstream | bajo a medio, tooling y regresión |
| @simple-git/argv-parser      | 1.1.1           | GHSA-v5rq-49vh-5v5c                                                                                                                                                                                                                                        | D          | >=2.0.1                                                 | retirada upstream por DevTools 3.4.4                 | bajo a medio, tooling y regresión |
| simple-git                   | 3.36.0          | GHSA-x6jw-m9v5-85vh, GHSA-g4wm-2vf7-vfgr, GHSA-858h-whjf-mvg5                                                                                                                                                                                              | D          | >=4.0.1, >=4.0.0                                        | retirada upstream por DevTools 3.4.4                 | bajo a medio, tooling y regresión |
| source-map-js                | 1.2.1           | GHSA-68fv-2mgg-jv7q                                                                                                                                                                                                                                        | B          | >=1.2.2                                                 | resolver patch/minor compatible en su rango upstream | medio, SSR/APIs/imágenes          |
| @vue/server-renderer         | 3.5.40          | GHSA-g2v6-rqmx-r4w6                                                                                                                                                                                                                                        | B          | >=3.5.42                                                | 3.5.44 mediante Vue alineado                         | medio, SSR/APIs/imágenes          |
| prosemirror-view             | 1.41.8          | GHSA-c8x8-7fp4-3x9w                                                                                                                                                                                                                                        | E          | >=1.42.3                                                | resolver patch/minor compatible en su rango upstream | bajo a medio, tooling y regresión |
| sharp                        | 0.35.4          | GHSA-wq5f-xc86-pv6w                                                                                                                                                                                                                                        | B          | >=0.35.5                                                | 0.35.5+ dentro de ^0.35.3 de IPX                     | medio, SSR/APIs/imágenes          |
| shell-quote                  | 1.10.0          | GHSA-pqg4-j6r4-53mv                                                                                                                                                                                                                                        | D          | >=1.11.0                                                | 1.11.0+ dentro del rango de launch-editor            | bajo a medio, tooling y regresión |
| vite                         | 8.2.2           | GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg                                                                                                                               | D          | >=8.2.4                                                 | ^8.3.5 mediante builder Nuxt                         | bajo a medio, tooling y regresión |
| launch-editor                | 2.14.1          | GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm                                                                                                                                                                                              | D          | >=2.14.2                                                | ^2.14.2 mediante DevTools                            | bajo a medio, tooling y regresión |
| @modelcontextprotocol/server | 2.0.0           | GHSA-jm63-cq47-j5jp, GHSA-46jr-4wx8-v453, GHSA-rvq5-wwqv-78pq, GHSA-f897-62hf-6gxq                                                                                                                                                                         | D          | >=2.3.0, >=2.1.0                                        | resolver patch/minor compatible en su rango upstream | bajo a medio, tooling y regresión |
| @vitest/mocker               | 4.1.11          | GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp                                                                                                                                                                                                                   | D          | >=4.1.12                                                | 4.1.12 mediante Vitest alineado                      | bajo a medio, tooling y regresión |
| @nuxt/nitro-server           | 4.5.2           | GHSA-vjh5-4x84-xrqp                                                                                                                                                                                                                                        | B          | >=4.6.2                                                 | 4.6.3 mediante Nuxt                                  | medio, SSR/APIs/imágenes          |
| nuxt                         | 4.5.2           | GHSA-vjh5-4x84-xrqp, GHSA-xfq5-w38q-pc2x, GHSA-jjm6-p2m9-9w4x                                                                                                                                                                                              | B, E       | >=4.6.2, >=4.6.0                                        | 4.6.3 mediante versión directa                       | medio, SSR/APIs/imágenes          |
| zod                          | 4.4.3           | GHSA-mrhx-c7xc-m3w5                                                                                                                                                                                                                                        | B          | >=4.6.6                                                 | 4.6.6 directa                                        | medio, SSR/APIs/imágenes          |
| undici                       | 8.10.2          | GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, GHSA-xjj6-f33q-929c, GHSA-4w7w-5xrc-9h26, GHSA-2m5v-pch6-74hx, GHSA-qrxm-fqhp-jwvm, GHSA-9fm3-97px-rjf6, GHSA-55wc-3pg8-jfw6                                                                                     | C          | >=8.12.2                                                | ^8.12.3 mediante Nuxt                                | bajo a medio, tooling y regresión |
| happy-dom                    | 20.11.13        | GHSA-834v-8h66-3h79, GHSA-c8p4-j97h-3vg8, GHSA-5fpq-26gf-qwcr                                                                                                                                                                                              | D          | >=21.0.4, >=21.0.0, >=20.14.6                           | 20.14.6, residuales 21.x atribuidos                  | bajo a medio, tooling y regresión |
| deepmerge                    | 4.3.1           | GHSA-gcqx-w48m-w2h4                                                                                                                                                                                                                                        | C          | sin parche                                              | sin parche publicado, configuración build confiable  | bajo a medio, tooling y regresión |
| seroval                      | 1.6.7           | GHSA-f86p-h4j2-7qgj, GHSA-9wx9-5pv9-3349, GHSA-97r2-qh9m-474h, GHSA-wp97-x4hv-qvhp, GHSA-7rv5-mrxv-xcr9                                                                                                                                                    | D          | >=1.6.11, >=1.6.10, >=1.6.8                             | ^1.7.2 mediante builder Nuxt                         | bajo a medio, tooling y regresión |
| glob                         | 13.0.6, 10.5.0  | GHSA-3g3m-2fjr-6pw4                                                                                                                                                                                                                                        | C          | >=14.0.2                                                | mantener rangos upstream, clasificar residual C      | bajo a medio, tooling y regresión |
| @nuxt/vite-builder           | 4.5.2           | GHSA-648h-gw55-m2g7                                                                                                                                                                                                                                        | D          | >=4.6.3                                                 | 4.6.3 mediante Nuxt                                  | bajo a medio, tooling y regresión |
| minimatch                    | 10.2.6, 9.0.9   | GHSA-g3hv-75wg-m249                                                                                                                                                                                                                                        | C          | >=11.0.1                                                | mantener rangos upstream, clasificar residual C      | bajo a medio, tooling y regresión |

## Estrategia, verificación y rollback

Se aplicarán bloques separables de runtime/framework y tooling. Cada resolución se inspeccionará con git diff. Los commits de dependencias se registrarán por bloque y la documentación conservará su historial.

Primero ejecutar instalación normal, luego instalación con frozen-lockfile. Repetir Prisma format/validate/generate/status, lint, formato, tipos, Vitest completo, verificación de base vacía, E2E, visuales y build. El entorno de escritura será PostgreSQL temporal y se eliminará al terminar.

La prueba SSR del artefacto generado cubrirá Home, catálogo, producto, servicios, servicio, carrito, checkout, login, dashboard y Seguridad. Se inspeccionarán payload, JSON-LD, imágenes, sesión y exclusión de tooling ejecutable.

Para rollback, revertir los commits de dependencias en orden inverso, reinstalar con frozen-lockfile y repetir los gates. Los datos conservan su esquema y las 14 migraciones registradas.

## Estado de ejecución

### Adaptaciones demostradas durante resolución

La comprobación del primer selector por padre detectó una segunda copia 1.41.8 mediante prosemirror-state y otros peers. Se usa prosemirror-view 1.42.3 para todas sus rutas 1.x, incluidos los rangos ^1.9.10 y ^1.38.1. Así el lockfile elimina ambas copias vulnerables sin nuevas dependencias directas.

La actualización selectiva normal dejó prosemirror-view 1.41.8 bajo @tiptap/pm 3.24.0. Se agrega el override acotado @tiptap/pm>prosemirror-view 1.42.3, compatible con su rango ^1.38.1. Corrige GHSA-c8x8-7fp4-3x9w sin modificar Nuxt UI ni Tiptap. Retirarlo cuando upstream resuelva una versión corregida. Aunque la aplicación no usa UEditor, el parche compatible evita aceptar un high corregible de bajo riesgo.

Nuxt 4.6.3 requiere Node 24.15.0 o posterior compatible. El proyecto declara ese mínimo. Su vue-router 5.4.0 exige Pinia ^3.0.4 o ^4.0.2. Se aplica únicamente el patch Pinia 3.0.4. El warning previo de @pinia/nuxt 1.0.2 que pide Pinia 4 se registra y se verifica funcionalmente, sin forzar una major.

El typecheck detectó que session.password ahora exige string. La configuración utiliza cadena vacía cuando falta la variable. La validación existente de secretos conserva el bloqueo de configuración inválida en producción.

Plan registrado antes de editar package.json y pnpm-lock.yaml. Ejecución finalizada. El reporte siguiente registra el cierre del PASS 27.

## PASS 27 — FINAL REPORT

### HEAD inicial

`675b73967d99f2c12b40fbf750a54125c0c65696`, main, árbol limpio.

### HEAD final

Commit de código verificado `b03f41b339427194bb45f1b503be57efe7f715ce`. La documentación y evidencias se registran en el commit posterior de este PASS. Se agruparon runtime y tooling porque comparten una única resolución congelada y ensayada del lockfile. Ambos bloques y su configuración pueden revertirse juntos.

### Audit before

| Critical | High | Moderate | Low |
| -------- | ---- | -------- | --- |
| 3        | 35   | 32       | 11  |

### Dependencias analizadas

81 registros iniciales atribuidos individualmente, agrupados en 26 paquetes. Cada registro conserva GHSA, versión, ruta, fixed y clasificación A–F. [Antes](phase9/dependency-classification-before.json), [después](phase9/dependency-classification-after.json).

### Runtime vulnerabilities

El audit --prod posterior tiene 0 Critical, 0 High, 2 Moderate y 1 Low. Los tres residuales productivos del árbol instalado corresponden al build y quedan excluidos del artefacto. La inspección y pruebas locales sustentan 0 Critical/High runtime pendientes dentro de este alcance. [Audit productivo](phase9/dependencies-production.json), [artefacto](phase9/dependency-artifact-after.json).

### Development/tooling vulnerabilities

Quedan dos High de Happy DOM en pruebas y tres avisos C de build. Las condiciones, ausencia runtime y aceptación temporal se documentan arriba por advisory.

### Packages updated

Nuxt 4.6.3, Vue/renderer 3.5.44, Zod 4.6.6, Pinia 3.0.4, Vitest/coverage 4.1.12 y Happy DOM 20.14.6, además de las transitivas detalladas en la tabla y JSON posterior. El manifiesto final incorpora @vue/shared 3.5.45 dentro del rango compatible de Nuxt. Renderer y compiladores resuelven 3.5.44.

### Packages intentionally not updated

Prisma CLI, Client y adapter 7.10.0, Nuxt UI 4.11.0, Reka 2.10.3, pg 8.23.0, image 2.1.0, icon 2.5.1 y auth-utils 0.5.30. Las majors Happy DOM 21, glob 14 y minimatch 11 quedan fuera del cambio compatible mínimo.

### Overrides

Vue actualiza su override previo a 3.5.44. Prosemirror-view 1.42.3 es el único override nuevo, justificado por las rutas peer persistentes y compatible con sus rangos 1.x. Los demás overrides conservan la política previa.

### Audit after

| Critical | High | Moderate | Low |
| -------- | ---- | -------- | --- |
| 0        | 2    | 2        | 1   |

### Remaining advisories

Happy DOM GHSA-834v-8h66-3h79 y GHSA-c8p4-j97h-3vg8, glob GHSA-3g3m-2fjr-6pw4, minimatch GHSA-g3hv-75wg-m249 y deepmerge GHSA-gcqx-w48m-w2h4. [Rutas y condiciones](phase9/dependency-classification-after.json).

### Risk acceptance

Aceptación técnica temporal limitada a fixtures y configuración de build confiables. Revisión máxima propuesta para 2026-12-08, adelantada ante cambio de exposición, entrada externa o parche upstream compatible. La inspección final excluye estos paquetes del artefacto ejecutable. Continúan tres warnings previos de peers, descritos arriba y cubiertos por regresión.

### Prisma

PASS. Format --check, validate, generate, migrate deploy/status y ensayo de base vacía. CLI/Client/adapter 7.10.0.

### Schema

UNCHANGED. Hash SHA256 conservado y diff Prisma vacío desde HEAD inicial.

### Migrations

14/14. SQL histórico con hashes iguales y todas las migraciones aplicadas en bases temporales.

### Lint

PASS.

### Format

PASS. Se repite el chequeo global después de documentar las evidencias finales.

### Typecheck

PASS. Se adaptó session.password al tipo string requerido. La validación productiva de secretos permanece cubierta por sus pruebas.

### Vitest

169 PASS en 26 archivos.

### Database isolated verification

PASS. test:database:phase8-5 aprobó 57 pruebas de integración adicionales tras migración y seed de otra base vacía. Todas las bases temporales de los ensayos se eliminaron.

### E2E

62 PASS, incluido catálogo, variantes, carrito, checkout, pedidos, tickets, sesiones, caché y responsive.

### Visual

19/19 PASS con snapshots existentes.

### Build

PASS. Node-server local Windows x64, sharp 0.35.5 y binarios correspondientes. El artefacto inspeccionado se construyó y ejecutó en esta máquina.

### Security module regression

PASS. Incluye seis unitarias, cinco de integración y cinco E2E del módulo, además de la regresión de sesión existente. CRUD de usuarios, permisos de cuatro roles, denegación a ADMIN/SALES/SUPPORT, cambios sobre sesión existente, auditoría y protección contra bloqueo propio.

### Production artifact inspection

PASS. Se inspeccionaron 792 archivos JavaScript y 235 source maps del build nuevo. simple-git, argv-parser, shell-quote, @nuxt/devtools, launch-editor, Happy DOM, glob, minimatch y deepmerge figuran ausentes como paquetes ejecutables y sus imports no aparecen. Dos manifiestos de OAuth conservan menciones de metadata de desarrollo. El análisis de fuentes de los source maps descartó el falso positivo de texto global/global-polyfills. Se separan strings de binarios nativos del inventario JavaScript.

Las diez rutas comprobadas fueron Home, productos, producto, servicios, servicio, carrito, checkout, /admin/login, /admin y /admin/seguridad. Todas respondieron 200, conservaron payload SSR, un H1 y completaron hidratación. Consola sin errores ni warnings observados. Se parseó el JSON-LD presente. El Hero NuxtImg cargó y las transformaciones WebP y AVIF respondieron 200.

Se verificaron cookie HttpOnly/Secure/SameSite=Lax en la respuesta, acceso visitante 401, acceso autenticado 200 y logout real seguido de 401. Para navegar localmente por HTTP se copiaron exclusivamente las cookies de la sesión QA sin Secure. La prueba valida SSR y aplicación de sesión en localhost. La verificación de transporte HTTPS queda fuera de este ensayo local.

[Regresión completa](phase9/pass27-regression.json), [SSR final](phase9/pass27-ssr.json), [reensayo aislado](phase9/pass27-ssr-recheck.json), [inspección](phase9/dependency-artifact-after.json).

### Incidencias de verificación y recuperación

La [matriz final consolidada](phase9/pass27-final-checks.json) reúne los gates completos, el reensayo SSR aprobado y la aceptación temporal. Conserva una referencia explícita al ensayo SSR inicial fallido.

La ejecución completa original conserva un fallo del recorrido SSR que suponía /login. El login real utiliza /admin/login y layout propio. Se corrigieron además el indicador de montaje usado por el script, la suposición de borrado por Max-Age=0 y la captura del 401 esperado como error de consola. Los intentos se conservan como pass27-ssr-first/second/third/fourth-attempt y sus checks disponibles. El reensayo final usa el comportamiento normal del navegador para logout y el cliente HTTP para la comprobación negativa. Estas adaptaciones pertenecen al script de verificación local.

El warning pg de consultas simultáneas continúa registrado en las pruebas. Se conserva como hallazgo F9-07 del informe general. Los hallazgos F9-05, F9-06, F9-08 y F9-09 conservan su seguimiento en la auditoría general.

### PASS 27 status

**PASSED**, con aceptación temporal acotada de los cinco avisos de build/pruebas. La matriz final utiliza los gates completos y el reensayo SSR aprobado. El cierre general de fase 9 conserva sus hallazgos operativos en el informe general.

## Resolución aplicada y residuales

La instalación normal y la instalación con frozen-lockfile terminaron correctamente. La primera regeneración falló por un solapamiento entre dos operaciones pnpm. Se repitieron secuencialmente instalación, postinstall completo de Nuxt/Prisma y frozen-lockfile, todos con exit 0. Los logs conservan el intento fallido y la recuperación.

El audit posterior tiene 0 críticos, 2 altos, 2 moderados y 1 bajo. La matriz individual relaciona los 81 registros iniciales con su resolución y conserva los cinco avisos residuales con rutas completas. [Audit posterior](phase9/dependencies-after.json), [clasificación y resoluciones](phase9/dependency-classification-after.json).

| Paquete directo      | Antes    | Después | Motivo                                         |
| -------------------- | -------- | ------- | ---------------------------------------------- |
| nuxt                 | 4.5.2    | 4.6.3   | advisories Nuxt y builder, resolución upstream |
| vue                  | 3.5.40   | 3.5.44  | renderer corregido y requisito Nuxt            |
| zod                  | 4.4.3    | 4.6.6   | advisory directo en validación                 |
| pinia                | 3.0.3    | 3.0.4   | peer nuevo de vue-router 5.4.0                 |
| vitest / coverage-v8 | 4.1.11   | 4.1.12  | mocker corregido y versiones alineadas         |
| happy-dom            | 20.11.13 | 20.14.6 | corrección compatible en 20.x                  |

Las resoluciones transitivas corregidas incluyen sharp 0.35.5, source-map-js 1.2.2, devalue 6.0.3, Vite 8.3.6, undici 8.12.4, seroval 1.7.10, node-forge 1.4.3, fast-uri 3.1.9, brace-expansion 5.0.12, serialize-javascript 7.1.4, shell-quote 1.12.0, launch-editor 2.14.2, MCP server 2.4.0 y prosemirror-view 1.42.3. simple-git y argv-parser desaparecen del lockfile.

### Overrides finales

Se conserva el conjunto previo de overrides de @tiptap/core, deepmerge-ts, esbuild, mysql2 y nanoid. Vue cambia su override existente a 3.5.44 para mantener un único renderer/runtime/compiladores. El único override nuevo es prosemirror-view 1.42.3, compatible con los rangos 1.x del árbol e imprescindible para resolver las copias por peers que permanecieron tras la actualización selectiva.

Se conserva la excepción histórica minimumReleaseAgeExclude de happy-dom 20.11.13 como parte de la política previa. El paquete instalado queda fijado a 20.14.6.

### Avisos altos de pruebas

Happy DOM 20.14.6 conserva GHSA-834v-8h66-3h79. Exige evaluar HTML o módulos ESM controlados por atacante con JavaScript habilitado. Se usa exclusivamente como entorno Vitest con fixtures del repositorio. La corrección requiere 21.0.4. [Advisory de compilación ESM](https://github.com/advisories/GHSA-834v-8h66-3h79).

Happy DOM 20.14.6 conserva GHSA-c8p4-j97h-3vg8. Al procesar HTML no confiable, iframe y stylesheet pueden originar solicitudes a URLs arbitrarias. Las entradas de las pruebas son controladas y la aplicación utiliza el renderer Vue/Nitro. La corrección cambia los defaults en la major 21. [Advisory de SSRF](https://github.com/advisories/GHSA-c8p4-j97h-3vg8).

La aceptación técnica temporal se limita al entorno de pruebas controlado. Reabrir al introducir HTML externo en pruebas, incorporar Happy DOM al servidor o disponer de un parche compatible. Fecha de revisión máxima propuesta, 2026-12-08. La exclusión del artefacto final se registra como evidencia separada.

### Avisos de build

Glob 13.0.6 conserva GHSA-3g3m-2fjr-6pw4 mediante Nitro y @vercel/nft. Requiere patrones o árboles influenciados por atacante y depende de cancelación AbortSignal para limitar trabajo. El uso observado corresponde al trazado del repositorio durante build. La corrección 14.0.2 sale del rango upstream. [Advisory de cancelación](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).

Minimatch 10.2.6 conserva GHSA-g3hv-75wg-m249 mediante glob y readdir-glob. Requiere un patrón adversarial con optimizationLevel >= 2. Los patrones de empaquetado provienen de configuración confiable. La corrección 11.0.1 sale de los rangos upstream. [Advisory de amplificación](https://github.com/advisories/GHSA-g3hv-75wg-m249).

Deepmerge 4.3.1 conserva GHSA-gcqx-w48m-w2h4 mediante @rollup/plugin-node-resolve de Nitro. Requiere objetos fuente maliciosos en merge. Se utiliza con configuración de build confiable. El audit informa que falta parche publicado. [Advisory de prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

La aceptación temporal de estos tres avisos se limita al build con código y configuración revisados. Revisión máxima propuesta, 2026-12-08, o antes si cambia su exposición o aparece una resolución upstream compatible.

### Compatibilidad conservada

Nuxt UI 4.11.0, Reka 2.10.3, Prisma CLI/Client/adapter 7.10.0, pg 8.23.0, image 2.1.0, icon 2.5.1 y auth-utils 0.5.30 conservan sus versiones. Se registran los warnings previos de peers de Tiptap, Pinia Nuxt y el adaptador opcional Argon2. El nuevo warning de router/Pinia se corrigió con el patch 3.0.4. La regresión verifica esas combinaciones funcionalmente.
