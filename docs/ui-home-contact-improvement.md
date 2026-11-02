# UI/UX del cierre de contacto de Inicio

Revisión: 1 de noviembre de 2026 (America/Guayaquil).

## Objetivo y diseño

Se refuerza la sección final para invitar a escribir a AJKSolutionS, manteniendo el título “¿Necesitas ayuda para elegir?”.

- Cierre centrado con fondo azul institucional, texto claro, borde redondeado y márgenes nativos de UContainer.
- Mensaje directo: “Cuéntanos qué necesitas. Te orientamos en productos, licencias digitales y servicios para encontrar la opción que se ajuste a ti.”
- Un solo CTA destacado: “Escríbenos por WhatsApp”, con superficie mínima de 56 px y foco visible.
- Aviso visible y accesible de apertura en otra pestaña mediante aria-describedby.
- El texto del botón puede envolver líneas en pantallas pequeñas.
- No se añaden imágenes, dependencias, botones secundarios ni promesas de tiempos de respuesta.

## Comportamiento conservado

PublicHomeContact recibe el WhatsApp de home.settings.business.whatsapp. Utiliza buildWhatsAppUrl y conserva el mensaje preparado anterior: “Hola, necesito asesoría sobre productos, licencias digitales o servicios.”.

Con número configurado, el enlace abre wa.me en otra pestaña con rel noopener noreferrer. Sin número o sin dígitos utilizables, el CTA pasa a “Consultar servicios”, lleva a /servicios y presenta un mensaje coherente con ese destino.

No se cambian el número comercial, su normalización administrativa, el helper compartido, los pedidos o las solicitudes. La lógica reactiva del CTA se mueve desde index.vue al componente y sigue actualizándose cuando cambia la configuración recibida.

## Archivos

- app/components/PublicHomeContact.vue.
- app/pages/index.vue: sustituye exclusivamente el cierre y pasa la configuración comercial.
- tests/unit/home-contact.test.ts: enlace con número y mensaje, alternativa sin número y actualizaciones reactivas.
- Dos snapshots de Inicio afectados por la presentación del cierre.
- docs/contact-responsive/: medidas y capturas antes/después.
- Este informe.

Se conservan las secciones anteriores y las preferencias actuales del usuario. Sin cambios de backend, Prisma, migraciones o dependencias.

## Validación

Lint, formato global, tipos, build de producción y 21 pruebas relacionadas PASS.

Chromium de producción: seis tamaños PASS, sin desbordamiento ni recorte del texto del CTA, con márgenes del Hero y superficie táctil adecuada. Se comprobó el WhatsApp comercial configurado, su mensaje, target y rel; el foco y la apertura mediante Enter también pasaron. La navegación a wa.me se interceptó con HTML local y no se envió ningún mensaje.

Las capturas de escritorio y móvil se inspeccionaron visualmente. Playwright: cinco pruebas PASS en 1.3 minutos, incluidas las dos comparaciones visuales de Inicio (390/1440) y tres regresiones de viewport/favicon.

Se actualizaron únicamente los snapshots de Inicio. Los fixtures se ejecutaron en una base temporal, eliminada al finalizar; no se modificaron los datos comerciales.

La revisión de Chromium cubre 320, 390, 768, 1024, 1440 y 1920 px: márgenes del Hero, CTA visible sin recorte, tamaño táctil, foco y destino configurado. La apertura externa se intercepta localmente para probar el enlace sin contactar WhatsApp ni enviar mensajes.

| Pantalla   | Antes                                       | Después                                      |
| ---------- | ------------------------------------------- | -------------------------------------------- |
| Escritorio | [Antes](contact-responsive/before-1440.png) | [Después](contact-responsive/after-1440.png) |
| Móvil      | [Antes](contact-responsive/before-390.png)  | [Después](contact-responsive/after-390.png)  |

No se realiza commit, push ni despliegue automático.
