# Rendimiento del navegador local

Revision: 2026-10-18. Alcance: desarrollo en localhost:3000; no Vercel ni cambios de base de datos.

## Diagnostico

- La medicion inicial llego a DOMContentLoaded en 704 ms y completo la hidratacion en 10 990 ms,
  con 1 019 solicitudes JavaScript. PostgreSQL respondio a SELECT 1 en 1-5 ms.
- Nuxt UI 4.11 transpila reka-ui. Nuxt excluye las dependencias transpiladas de la
  precompilacion de Vite: el navegador termina solicitando el grafo de modulos del barrel.
- DevTools estaba habilitado por defecto. Ademas, el entorno tiene DEBUG=release y Nuxt
  activaba trazas de hooks, profiling y logs detallados por peticion.
- La compilacion inicial de Nitro tambien tarda: se observaron 36-53 segundos durante
  esta revision. Abrir la pagina antes de terminar esa compilacion no equivale a medir
  la apertura con el servidor listo. Las mediciones durante reinicios, typecheck y
  presion de memoria se excluyen de la comparacion de apertura estable.

## Ajuste

- Hook vite:extendConfig solo en cliente y fuera de produccion: retira reka-ui de
  optimizeDeps.exclude e incluye @nuxt/ui > reka-ui para precompilar la dependencia
  transitiva sin agregar dependencias ni modificar node_modules.
- En el SSR de desarrollo se declara reka-ui en ssr.external: Node carga su ESM
  ya compilado. La regla explicita tiene precedencia sobre noExternal segun Vite.
  No se cambia ninguna otra dependencia SSR ni se aplica al build productivo.
- Nuxt DevTools queda opt-in mediante NUXT_DEVTOOLS=true.
- El debug detallado de Nuxt queda opt-in mediante NUXT_DEBUG=true, independiente de
  DEBUG heredado por otros programas. No se modifica el entorno global de Windows.
- Se conservan SSR, HMR, componentes, permisos, consultas, PostgreSQL y configuracion
  de produccion. No se cambian migraciones, secretos ni variables de Vercel.

## Repetir la medicion

1. Ejecutar pnpm dev y esperar el mensaje de compilacion de Nitro completada.
2. Sin ejecutar build/typecheck al mismo tiempo, ejecutar:

```powershell
node scripts/measure-local-browser.mjs
```

El script abre tres contextos nuevos de Chromium, sin compartir cache de navegador.
Mide TTFB (primer byte HTML), DOMContentLoaded e hidratacion real del layout, solicitudes JavaScript,
uso de Reka precompilado y errores de pagina. No crea registros ni inicia sesion.
El servidor conserva su cache de transformaciones entre muestras; no son tres arranques
en frio de Nuxt. PERF_BASE_URL permite otro origen local y PERF_SAMPLES acepta 1-10.

Las primeras muestras con la precompilacion activa registraron 409 solicitudes JavaScript
y 3 278-5 306 ms hasta hidratacion, frente a 1 019 solicitudes y 10 990 ms iniciales.
No son una garantia de latencia: el hardware, la carga y el estado de compilacion influyen.

## Verificacion final

- Typecheck de Nuxt y comprobacion vue-tsc de los tipos generados: PASS.
- ESLint de los archivos de codigo modificados, Prettier y git diff --check: PASS.
- Pruebas unitarias: 11 archivos, 91 pruebas PASS.
- Chromium: productos, servicios, carrito y login HTTP 200; menu movil funcional;
  sin excepciones de pagina. No se crean registros para este smoke.
- Ultima serie con el ajuste SSR final, tres contextos nuevos:

| Muestra | TTFB HTML | DOMContentLoaded | Interactiva | Solicitudes JS |
| ------- | --------- | ---------------- | ----------- | -------------- |
| 1       | 540 ms    | 2 033 ms         | 8 025 ms    | 408            |
| 2       | 1 473 ms  | 2 211 ms         | 7 105 ms    | 408            |
| 3       | 631 ms    | 1 702 ms         | 4 936 ms    | 408            |

Estas cifras no equivalen a un arranque frio completo. El ultimo reinicio completo
observado tardo aproximadamente 105 segundos hasta servidor listo, incluidos 64 segundos
de Nitro; un reinicio posterior registro 36 segundos de Nitro. La carga inicial de Vite
y la compilacion siguen siendo una limitacion local pendiente; no se declara eliminada
toda la demora. Las mediciones anteriores etiquetadas htmlMs eran DOMContentLoaded,
no TTFB: el diagnostico ahora muestra ambos tiempos por separado.

## Referencias

- https://vite.dev/guide/dep-pre-bundling.html
- https://github.com/nuxt/ui/issues/6296
- https://vite.dev/config/ssr-options
