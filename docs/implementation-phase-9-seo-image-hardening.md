# Fase 9 — Hardening de imágenes de servicio y SEO de Home

Inicio 2026-11-08 y cierre 2026-11-09, America/Guayaquil.

## Actualización 2026-11-09 — investigación F9-05 y smoke F9-06

F9-05 PARTIAL. Se reprodujo TTFB 9673.5 ms y LCP 12760 ms en Chromium productivo. El request cc923c96-2bf4-43f0-947d-644cd5d958e3 se correlacionó con 1663.48 ms dentro de la aplicación. La causa completa del pico sigue pendiente de aislamiento. Se completaron doce procesos HTTP locales, seis procesos locales con navegador, dieciocho navegaciones productivas y observación separada de consultas, caché, SSR y chunks. [Investigación y límites](implementation-phase-9-performance-investigation.md).

El operador eliminó manualmente desde Administración → Servicios → Diagnóstico técnico la URL externa de imagen. El API productivo confirma imagen null. F9-06 permanece CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING. El alias sigue en 675b739, anterior al fallback compartido, y Home publica otros dos servicios. El smoke móvil y escritorio registró cero solicitudes a los orígenes retirados, cero ORB observado y CLS 0. Listado y ficha conservan precio, CTA y formulario. La validación del nuevo placeholder en las tres superficies depende del candidato desplegado y del servicio publicado en Home. [Evidencia productiva](phase9/f9-06-production-smoke.json).

## Baseline

HEAD inicial `39f96401ce6e43a19ccec6a8405d1f74c0503763`, rama main y árbol limpio. PASS 27 PASSED. Nuxt 4.6.3, Vue 3.5.44, Zod 4.6.6 y Pinia 3.0.4. Baseline de 169 Vitest, 62 E2E, 19 visuales y build aprobado. Prisma CLI/Client/adapter 7.10.0, schema y 14 migraciones registrados por SHA256. Audit --prod posterior a PASS 27 con cero críticos y altos.

[Baseline de este bloque](phase9/f9-06-f9-08-baseline.json), [PASS 27](phase9-dependency-remediation.md).

## F9-06 — Reproducción y causa

La base local contiene Diagnóstico Técnico, slug diagnostico-tecnico. El GET de su imagen administrada devolvió 200 e image/png. Chromium recibió image/webp y cargó la imagen en Home, listado y ficha. NuxtImg utilizó la URL original directamente. [Referencia administrada actual](https://icontinental.edu.pe/wp-content/uploads/2018/05/feria-de-servicio-ic.png).

El ORB histórico permanece registrado en production-smoke.json y corresponde a otra URL, del origen guayaquil.solutekla.com. Ese origen respondió 403 con text/html en esta revisión. Una respuesta HTML controlada con HTTP 200 sustituyó únicamente la solicitud de imagen del navegador QA. Las tres superficies conservaron una imagen rota visible y carecieron de fallback antes del cambio. La evidencia separa ambos orígenes y la reproducción controlada.

El seed crea Diagnóstico técnico y deja imageUrl ausente. El valor observado corresponde a contenido administrado posteriormente. La revisión del directorio public/images encontró assets institucionales y de las secciones Hero, Respaldo y Cómo comprar. La selección de una fotografía comercial específica para Diagnóstico continúa dependiendo de contenido aprobado.

[URL, MIME, respuestas y reproducción controlada](phase9/f9-06-image-validation.json).

## F9-06 — Mitigación de código

PublicServiceImage concentra el comportamiento de imagen válida, URL ausente y error de carga. Mantiene el contenedor, aspect-ratio, dimensiones y estilo AJK. El fallback muestra wrench, superficie primary/10 y nombre accesible de la imagen. La imagen fallida se retira del DOM. El estado se reinicia al cambiar src.

Las tres superficies reutilizan el componente. ServiceCard conserva badge, precio y Ver servicio. Home conserva su enlace de tarjeta y Solicitar servicio. La ficha conserva su formulario y Crear ticket de servicio.

El placeholder para URL ausente ocupa ahora el espacio de imagen en Home y ficha. Esa decisión mantiene dimensiones estables y requiere revisar las capturas visuales afectadas. La lista ya tenía un placeholder de aspect-ratio equivalente.

## Estado del contenido productivo

**F9-06 — CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING.**

El contenido local se inspeccionó mediante lecturas. El reemplazo del dato productivo y su validación final requieren el smoke del candidato desplegado. Las URLs ficticias del test se limitan a fixtures y respuestas interceptadas en PostgreSQL temporal. El logo institucional se utiliza únicamente como imagen de prueba válida de esos fixtures.

## F9-08 — Implementación y fuentes

Home construye una Organization y un WebSite a partir de PublicSettings ya recibido por /api/home. La búsqueda global confirmó que Home y su layout carecían de esos bloques. El proveedor Organization anidado del Service de las fichas conserva su contrato.

La organización utiliza business.name, contacto disponible, domicilio y ciudad configurados, country y redes válidas. PostalAddress admite los campos disponibles. Teléfono, correo, dirección y sameAs se omiten cuando faltan datos. Las redes aceptan URL HTTP/HTTPS y excluyen credenciales. La lista omite valores vacíos y duplicados.

WebSite utiliza seo.siteName y la descripción disponible. Publisher referencia el mismo @id de Organization. Las URLs se construyen con NUXT_PUBLIC_APP_URL y canonicalUrl. El archivo public/ajksolutions-official.png existe y aporta el logo absoluto.

La emisión se realiza mediante useHead reactivo, con keys estables. El canonical y los metadatos title, description, Open Graph y Twitter existentes siguen cubiertos por las pruebas.

## Serialización y seguridad

Se reutiliza serializeJsonLd de shared/utils/public-catalog.ts. Su JSON.stringify neutraliza < para impedir cierre de script. Los tests conservan el marcador inocuo anterior __phase9JsonLdProbe y el caso literal </script><script>marker</script>. El contenido debe permanecer como texto dentro de JSON-LD parseable.

Las pruebas unitarias verifican opciones vacías, direcciones parciales reales, URL social inválida, publisher y conservación de los datos recibidos. Los E2E verifican SSR y la ausencia de un script ejecutable adicional, restaurando los settings del entorno temporal.

## Pruebas y regresión

El primer typecheck y 22 pruebas unitarias específicas aprobaron. Se añadieron tres pruebas de imagen y nueve de JSON-LD. Se agregaron once E2E específicos que recorren tres estados de imagen por tres superficies y dos casos de SEO.

La primera ejecución E2E expuso el timeout predeterminado de cinco segundos para hidratación. La prueba utiliza los 30 segundos del patrón existente. El reensayo identificó que el servicio genera su slug desde el nombre. El fixture toma ahora la URL guardada devuelta por la API y declara su precio e impuesto de prueba.

Las evidencias conservan los intentos iniciales y los reensayos aprobados. La regresión completa aprobó 181 Vitest, 73 E2E, 57 integraciones adicionales de base vacía y build. El reensayo visual aprobó 19/19 tras revisar y actualizar las cuatro referencias afectadas por el placeholder.

## Schema y migraciones

Se conservan hashes del schema y de los 14 SQL históricos. Cada runner registra deploy, status y limpieza de su base temporal. Este bloque utiliza fixtures aislados y conserva la arquitectura y los contratos comerciales.

## Consolidación documental y hallazgos

El informe general establece el estado vigente y conserva el historial previo a PASS 27. El bloqueo histórico por dependencias queda resuelto por PASS 27. Los PASS 28 a 32 conservan su estado individual pendiente de evidencia específica.

F9-09 queda RESOLVED INCIDENTALLY BY PASS 27. La revisión encontró cuatro deprecaciones DEP0155 históricas y cero en los builds de PASS 27 y actual. F9-05 y F9-07 conservan su seguimiento separado.

## Estado

**PARTIAL operativo.** F9-08 CLOSED, F9-09 RESOLVED INCIDENTALLY BY PASS 27 y F9-06 CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING. Código y QA locales aprobados.

## F9-06 + F9-08 FINAL REPORT

### HEAD inicial

`39f96401ce6e43a19ccec6a8405d1f74c0503763`, main y árbol limpio.

### HEAD final de código

`5e18af1bfe44ea8f1b8dc3d6107f25819d4017cd`. El commit documental posterior conserva las evidencias y el informe vigente.

### F9-06

La causa de presentación era la falta de estado de error de imagen en Home, listado y ficha. El origen de la URL ORB histórica respondió 403 y text/html durante esta revisión. La referencia administrada actual local es otra URL y devolvió 200 como imagen.

PublicServiceImage retira la imagen fallida y presenta wrench accesible en el contenedor AJK estable. Los casos null, URL válida y respuesta no decodificable aprobaron en las tres superficies. Se verificaron dimensiones, alt, navegación, precio y CTA.

**CODE FIXED / PRODUCTION DATA CORRECTED / FINAL SMOKE PENDING.** El dato local actual cargó. La validación del contenido productivo definitivo conserva su pendiente.

### F9-08

**CLOSED.** Organization y WebSite se emiten por SSR una sola vez en Home, parsean y utilizan PublicSettings y NUXT_PUBLIC_APP_URL. Publisher referencia organization. El logo utiliza el asset institucional verificado.

La serialización reutiliza serializeJsonLd. El marcador de inyección permanece como dato, conserva JSON parseable y genera cero scripts ejecutables nuevos. La prueba inicial que buscaba una subcadena en todo el HTML se refinó para inspeccionar el DOM inerte, porque los atributos de metadata pueden contener ese texto de forma válida. También se confirmó que el marcador global permanece ausente.

### F9-09

**RESOLVED INCIDENTALLY BY PASS 27.** El build histórico registró cuatro DEP0155. El build de PASS 27 y el actual registraron cero coincidencias de esa deprecación. Se registran hashes de los tres logs. [Evidencia de exports](phase9/f9-09-exports-validation.json).

### PASS 27 documentation cleanup

Actualizado. El informe general establece la autoridad del estado vigente, conserva el texto histórico de críticos/altos bajo Historial — estado previo a PASS 27 y explica que ese bloqueo fue resuelto. La tabla separa 27 PASSED y los PASS 28 a 32 con su cobertura y pendientes individuales.

### Gates y smoke

| Control                                    | Resultado                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Prisma format --check, validate y generate | PASS, CLI/Client/adapter 7.10.0                                                          |
| Prisma migrate status                      | PASS                                                                                     |
| Schema                                     | UNCHANGED, SHA256 igual al baseline                                                      |
| Migraciones                                | 14/14, cero nuevas, SQL histórico con hashes iguales                                     |
| Lint                                       | PASS tras adaptar las claves JSON-LD al estilo de propiedades calculadas del repositorio |
| Format                                     | PASS, incluido chequeo global final de documentación                                     |
| Typecheck                                  | PASS                                                                                     |
| Vitest completo                            | 181 PASS en 28 archivos                                                                  |
| DB isolated                                | 57 integraciones PASS adicionales sobre base vacía                                       |
| E2E completo                               | 73 PASS                                                                                  |
| Visual                                     | 19/19 PASS                                                                               |
| Build                                      | PASS, node-server local Windows x64                                                      |
| SSR smoke                                  | 18/18 PASS, tres rutas por tres estados de imagen en 390 y 1440 px                       |
| Inyección JSON-LD en build                 | PASS, JSON parseable y marcador inerte                                                   |
| Limpieza                                   | Bases temporales eliminadas y settings de QA restaurados                                 |

Las cuatro referencias visuales de Home y ficha, en móvil y escritorio, se revisaron antes de actualizarse por el placeholder requerido. Sus hashes nuevos coinciden exactamente con las capturas inspeccionadas. La comparación inicial aprobó las otras 15 y conservó los cuatro diffs esperados. El reensayo completo aprobó 19. [Revisión visual](phase9/f9-06-visual-review.json).

La ejecución completa original conserva el fallo inicial de lint y la comparación con las capturas previas. Los reensayos aprobados y la matriz consolidada identifican explícitamente esas recuperaciones. [Regresión original](phase9/f9-06-f9-08-regression.json), [reensayo visual](phase9/f9-06-f9-08-visual-recheck.json), [smoke SSR](phase9/f9-06-f9-08-ssr.json), [matriz final](phase9/f9-06-f9-08-final-checks.json).

El smoke comprobó HTTP 200, hidratación, un H1, ausencia de overflow e imagen rota visible, JSON-LD parseable y cero errores JavaScript o de hidratación. La cobertura utilizó las rutas reales /, /servicios y /servicios/diagnostico-tecnico. La prueba del marcador restauró los settings de la base temporal al terminar.

### Remaining Fase 9 findings

F9-05 conserva la investigación de primera Home/frío pendiente. F9-07 conserva el warning pg pendiente. F9-06 conserva la validación de contenido productivo y smoke final. F9-08 queda cerrado y F9-09 queda resuelto incidentalmente por PASS 27.

### Block status

**PARTIAL operativo. Código y QA locales aprobados.** El pendiente de contenido productivo de F9-06 determina el estado parcial del bloque.
