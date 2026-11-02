# UI/UX de Licencias digitales en Inicio

Revisión: 1 de noviembre de 2026 (America/Guayaquil).

## Implementación

Se reemplaza el bloque de “Software para tus proyectos / Licencias digitales” por PublicHomeDigital, siguiendo el Hero, Soluciones y Soporte.

- Contenedor nativo de Nuxt UI y panel con azul institucional suave, radio de 1.5 rem, borde y sombra coherentes con las secciones anteriores.
- Una columna en móvil/tablet y dos desde 1024 px, sin alturas fijas ni detección de pantalla con JavaScript.
- Se mantienen el título, el mensaje original y el CTA. El botón tiene superficie mínima de 48 px y foco visible.
- Guía semántica de tres pasos: elegir una solución, realizar la compra individual y coordinar pago/entrega por WhatsApp.
- Iconos Lucide mediante Nuxt UI; no se añaden imágenes, dependencias ni animaciones.
- No se prometen licencias automáticas o entregas instantáneas. La guía refleja el flujo existente.

## Corrección del acceso al catálogo

Al revisar el CTA existente /productos?productType=DIGITAL se detectó que la página de catálogo descartaba productType al construir su consulta a /api/products. El backend ya admitía este filtro.

Se añade productType a la lista de parámetros enviados por app/pages/productos/index.vue y se presentan etiquetas legibles “Tipo: Digital” / “Tipo: Físico”. No se cambian servicios de backend, esquemas, base de datos ni lógica de compra.

## Archivos

- app/components/PublicHomeDigital.vue: componente nuevo.
- app/pages/index.vue: sustituye exclusivamente el bloque digital.
- app/pages/productos/index.vue: envío y etiqueta del filtro de tipo.
- docs/digital-responsive/: capturas y medidas de esta sección.
- Dos snapshots de Inicio actualizados por este rediseño.
- Este documento.

Los cambios de las secciones anteriores y las preferencias actuales del usuario se conservan.

## Validación

Lint, tipos y build de producción PASS. Vitest: 18 pruebas PASS (Hero/campañas, soporte y dominio digital). Chromium de producción: seis tamaños PASS, sin desbordamiento horizontal, errores de JavaScript/consola ni avisos de hidratación; márgenes alineados con el Hero y CTA de al menos 48 px.

La navegación con teclado llegó al catálogo con productType=DIGITAL. Se verificó la etiqueta “Tipo: Digital”, la presencia de los productos digitales devueltos por la API y la ausencia de nombres de productos físicos del catálogo general. La comprobación espera el h1 de la página destino para no leer el DOM de Inicio durante la transición de Nuxt.

Playwright: cinco pruebas PASS en 1.8 minutos, incluidas las dos comparaciones visuales de Inicio y tres regresiones de viewport/favicon. Se actualizaron únicamente los snapshots de Inicio (390/1440). Los fixtures utilizaron una base temporal que se eliminó al finalizar, sin modificar los datos comerciales.

Las capturas finales de escritorio y móvil se inspeccionaron visualmente. El catálogo filtrado quedó registrado en [captura de catálogo digital](digital-responsive/catalogo-digital.png). Comprobación global de formato y git diff --check: PASS.

Chromium comprueba 320, 390, 768, 1024, 1440 y 1920 px, alineación con el contenedor del Hero, ausencia de desbordamiento, tamaño del CTA y teclado. Se valida la navegación al catálogo digital y la exclusión de productos físicos.

| Pantalla   | Antes                                       | Después                                      |
| ---------- | ------------------------------------------- | -------------------------------------------- |
| Escritorio | [Antes](digital-responsive/before-1440.png) | [Después](digital-responsive/after-1440.png) |
| Móvil      | [Antes](digital-responsive/before-390.png)  | [Después](digital-responsive/after-390.png)  |

No se realiza commit, push ni despliegue automático.
