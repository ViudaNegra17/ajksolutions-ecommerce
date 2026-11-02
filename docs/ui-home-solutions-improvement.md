# UI/UX de la sección Soluciones AJKSolutionS

Revisión: 1 de noviembre de 2026 (America/Guayaquil).

## Alcance

Se mejora exclusivamente la sección “Elige tu camino / Soluciones AJKSolutionS” de Inicio. El Hero es la referencia visual y permanece sin cambios.

## Diseño implementado

- UContainer nativo para mantener los mismos márgenes del Hero y el resto del portal.
- Fondo blanco a azul institucional suave; tarjetas blancas con iluminación azul, borde ajk-100, radio de 1.5 rem y la misma sombra del visual del Hero.
- Etiqueta superior, tipografía, color de títulos y ritmo de espaciado coherentes con el Hero.
- Iconos Lucide mediante Nuxt UI: equipos, llave digital y herramientas. Se conserva la numeración 01/02/03.
- Las tres tarjetas se convierten en enlaces completos, sin controles interactivos anidados. Los títulos y descripciones identifican el destino mediante aria-labelledby y aria-describedby.
- CTA con superficie mínima de 48 px, foco visible de alto contraste y estado hover solo para dispositivos con puntero fino.
- Respeto de prefers-reduced-motion: sin desplazamiento o transición para usuarios que reducen movimiento.
- Una columna en móvil/tablet y tres columnas desde 1024 px, con alturas iguales en escritorio, texto flexible y sin alturas fijas.
- Sin imágenes adicionales, nuevas dependencias ni JavaScript de detección de pantalla.

Se mantienen los textos de las tarjetas y sus destinos existentes: /productos, /productos?productType=DIGITAL y /servicios. Se añade una frase introductoria para orientar la elección. No se cambian filtros de catálogo, datos, APIs, migraciones ni otras secciones.

## Archivos

- app/components/PublicHomeSolutions.vue: componente nuevo de la sección.
- app/pages/index.vue: usa el componente y retira el bloque anterior.
- docs/solutions-responsive/: capturas y medidas antes/después.
- Dos snapshots existentes de Inicio, 390 y 1440 px, actualizados para reflejar esta sección.
- Este documento.

## Validación

Resultados locales: lint y typecheck PASS; siete pruebas de Hero/campañas PASS; build de producción PASS. Chromium: seis tamaños PASS, sin desbordamiento horizontal, errores de JavaScript, consola o hidratación; contenedor alineado con el Hero y alturas iguales en escritorio. Navegación con Tab y Enter hasta Servicios: PASS.

Se actualizaron únicamente los dos snapshots de Inicio y se repitieron sus comparaciones junto con las tres regresiones de viewport/favicon: cinco pruebas Playwright PASS en 1.2 minutos. Las pruebas con fixtures utilizaron una base temporal y esta se eliminó al finalizar. No se alteraron los datos comerciales.

Las capturas finales de escritorio y móvil se inspeccionaron visualmente. Para la sección móvil completa se usa un recorte de la página completa desde scroll inicial, evitando que el encabezado fijo se superponga artificialmente durante la captura del elemento. La captura móvil inicial presentaba esa superposición y no se usa como comparación visual de un defecto del sitio.

Se captura la sección antes/después en 390 y 1440 px. La verificación posterior cubre anchos 320, 390, 768, 1024, 1440 y 1920 px, alineación con el contenedor del Hero, ausencia de desbordamiento, igualdad de alturas en escritorio, enlaces accesibles y navegación con Tab/Enter.

| Pantalla   | Antes                                         | Después                                        |
| ---------- | --------------------------------------------- | ---------------------------------------------- |
| Escritorio | [Antes](solutions-responsive/before-1440.png) | [Después](solutions-responsive/after-1440.png) |
| Móvil      | [Antes](solutions-responsive/before-390.png)  | [Después](solutions-responsive/after-390.png)  |

No se realiza commit, push ni despliegue automático.
