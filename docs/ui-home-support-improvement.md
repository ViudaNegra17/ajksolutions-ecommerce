# UI/UX de soporte en Inicio

Revisión: 1 de noviembre de 2026 (America/Guayaquil).

## Alcance y diseño

Se mejora “Soporte para seguir adelante / ¿Tu equipo necesita atención?” siguiendo el Hero y Soluciones.

- UContainer mantiene los márgenes nativos del portal.
- Dos columnas desde 1024 px: introducción y enlace al catálogo a la izquierda, servicios a la derecha. Con un servicio, ambas columnas se centran verticalmente y la tarjeta ocupa el ancho disponible.
- Una columna en móvil/tablet. La colección usa CSS Grid auto-fit con tamaño mínimo limitado al ancho disponible; no hay detección de dispositivo con JavaScript.
- Azul institucional suave, radios de 1.5 rem, sombras y tipografía coherentes con las secciones anteriores.
- Imagen existente del servicio, cargada de forma diferida. No se añaden assets generados ni imágenes externas nuevas. El encuadre es ilustrativo y usa object-fit:cover.
- Categoría, nombre y descripción proceden del catálogo público.
- PublicServicePrice conserva la presentación de QUOTE, FIXED y FROM; no se inventan importes ni condiciones.
- Tarjeta completa enlazada a su ficha, sin enlaces anidados, con nombre accesible y foco visible. CTA de al menos 48 px.
- Hover solo con puntero fino, respetando prefers-reduced-motion.
- Si no hay servicios, se muestra un estado explícito y se conserva el acceso al catálogo.

El copy introductorio y los destinos originales se mantienen. No se modifican el Hero, Soluciones, otras secciones, APIs, precios, filtros, Prisma, migraciones ni dependencias.

## Archivos

- app/components/PublicHomeServices.vue: nuevo componente que recibe services.
- app/pages/index.vue: sustituye exclusivamente el bloque anterior de soporte.
- tests/unit/home-services.test.ts: regresiones de datos vacíos, un servicio y varios modos de precio.
- docs/support-responsive/: evidencias antes/después.
- Dos snapshots existentes de Inicio, afectados por la presentación de soporte.
- Este informe.

## Validación

Lint y typecheck PASS. Vitest: diez pruebas PASS (siete regresiones de Hero/campañas y tres de soporte). Build de producción PASS.

Chromium de producción: seis tamaños PASS, sin desbordamiento horizontal, errores JavaScript, errores de consola ni avisos de hidratación. El contenedor coincide con los márgenes del Hero. La imagen del servicio se verificó cargada antes de capturar. Navegación con Tab y Enter a la ficha: PASS. Se inspeccionaron las capturas de escritorio y móvil.

Formato global PASS. Playwright: cinco pruebas PASS en 1.3 minutos, incluidas las dos comparaciones visuales de Inicio (390/1440) y tres regresiones de viewport/favicon. Se actualizaron exclusivamente los snapshots de Inicio. La base temporal usada para los fixtures se eliminó al finalizar; no se modificaron los datos comerciales.

Se verifican 320, 390, 768, 1024, 1440 y 1920 px, márgenes respecto del Hero, ausencia de desbordamiento, enlaces, foco y navegación por teclado. Las capturas finales corresponden a los datos reales locales.

| Pantalla   | Antes                                       | Después                                      |
| ---------- | ------------------------------------------- | -------------------------------------------- |
| Escritorio | [Antes](support-responsive/before-1440.png) | [Después](support-responsive/after-1440.png) |
| Móvil      | [Antes](support-responsive/before-390.png)  | [Después](support-responsive/after-390.png)  |

No se realiza commit, push ni despliegue automático.
