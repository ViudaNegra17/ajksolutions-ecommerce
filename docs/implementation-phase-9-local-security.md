# Fase 9 — Seguridad administrativa y revisión local

Fecha 2026-11-08. Alcance vigente solicitado por el usuario, `http://localhost:3000`.

## Resultado de la revisión

Seguridad quedó implementada y validada con pruebas específicas. La revisión funcional local cubrió 23 rutas en 16 tamaños de pantalla, 368 comprobaciones de layout. Todas respondieron 200, hidrataron, conservaron un H1 y carecieron de overflow horizontal y errores JavaScript observados.

El cierre de fase 9 permanece **PARTIAL** por el resultado de la auditoría de dependencias y las verificaciones de aceptación pendientes. La evidencia anterior de producción se conserva como historial. Esta entrega utiliza el servidor local y bases PostgreSQL temporales para las operaciones de prueba.

## Hallazgo de la imagen enviada

El enlace `/admin/seguridad` estaba declarado en el sidebar con `security.manage`, pero resolvía a `app/pages/admin/[...slug].vue`. Ese catch-all mostraba “Módulo preparado”. Existían tablas User, Role, Permission y relaciones RBAC, además de autenticación y revalidación de sesiones.

El usuario autorizó implementar usuarios y roles antes del cierre. Se añadió una ruta específica `app/pages/admin/seguridad.vue` y se reutilizaron esas tablas y las cuatro definiciones de roles existentes.

## Pantalla y operación

- Pestaña Usuarios con búsqueda por nombre o correo, paginación, estados de carga/error/vacío y reintento.
- Alta con nombre, apellido, correo normalizado, contraseña inicial entre 12 y 128 caracteres, roles y estado.
- Edición de identidad, roles y activación. El formulario identifica la cuenta propia y mantiene su activación protegida.
- Pestaña Roles y permisos con los cuatro roles del sistema y sus permisos efectivos consultables.
- Roles asignables, SUPER_ADMIN, ADMIN, SALES y SUPPORT. La matriz existente conserva su autoridad.
- Tabla desplazable dentro de su contenedor en móvil, diálogo con labels, validación y cierre por Escape.
- Guardado mediante `useAdminRequest` con refresco selectivo de `admin:security:users`.
- Tras editar la propia identidad se reconsulta la sesión.
- La contraseña inicial se borra del estado del formulario al cerrar o guardar.

La consulta de roles y permisos se basa en PostgreSQL. Los cambios operativos se aplican mediante asignaciones de los roles existentes.

## API y validaciones

| Método y ruta                        | Operación                              |
| ------------------------------------ | -------------------------------------- |
| GET `/api/admin/security/users`      | Listado y búsqueda paginada            |
| POST `/api/admin/security/users`     | Alta, respuesta 201                    |
| PUT `/api/admin/security/users/[id]` | Edición, roles y activación            |
| GET `/api/admin/security/roles`      | Roles del sistema y permisos efectivos |

Los cuatro endpoints requieren `security.manage` mediante el guard existente. La página también aplica su comprobación de acceso. El seed concede esa capacidad a SUPER_ADMIN. Las pruebas comprobaron 401 anónimo y 403 para ADMIN, SALES y SUPPORT, incluyendo acceso directo a la URL.

Los esquemas estrictos rechazan permisos directos, campos adicionales, roles desconocidos/repetidos, UUID inválido y credenciales iniciales cortas. La búsqueda, paginación y longitudes de identidad están acotadas.

La respuesta y el listado incluyen únicamente campos seleccionados explícitamente. Las contraseñas iniciales se almacenan con Argon2id. La auditoría utiliza una representación segura de identidad, estado y códigos de rol.

## Consistencia y protección administrativa

Cada mutación ejecuta una transacción que adquiere `SELECT id FROM roles WHERE code = 'SUPER_ADMIN' FOR UPDATE`. Esa fila existente serializa las mutaciones administrativas.

Después del bloqueo se vuelve a comprobar que el actor siga activo y autorizado. La validación evita ejecutar una operación que quedó en espera después de revocar sus permisos.

La propia cuenta debe permanecer activa y conservar acceso a Seguridad. Desactivar o retirar el rol del último superadministrador activo devuelve 409. Los checks se realizan dentro de la misma transacción que las asignaciones y la auditoría.

La identidad y roles se revierten si falla el registro de auditoría. Se comprobó esa reversión con PostgreSQL. Dos altas simultáneas del mismo correo produjeron una sola cuenta y un conflicto 409. La comparación del correo contempla diferencias de mayúsculas y minúsculas, además del índice único existente.

La revalidación de sesión existente aplica cambios de roles y desactivaciones en la siguiente operación protegida. El E2E comprobó una sesión previa al cambio y posterior reactivación.

## Archivos principales

- `shared/schemas/security.schema.ts` y `shared/types/security.ts`.
- `server/repositories/security.repository.ts`.
- `server/services/security.service.ts`.
- `server/api/admin/security/`.
- `app/pages/admin/seguridad.vue`.
- `tests/unit/security-phase9.test.ts`.
- `tests/integration/security-phase9.test.ts`.
- `tests/e2e/security-phase9.spec.ts`.

La implementación utiliza las 14 migraciones existentes. Las evidencias de QA comparan hashes de schema y SQL histórico.

## Pruebas específicas

| Grupo                        | Resultado              |
| ---------------------------- | ---------------------- |
| Unitarias nuevas             | 6 PASS                 |
| Integración PostgreSQL nueva | 5 PASS                 |
| E2E Seguridad                | 5 PASS                 |
| Navegación local real        | 23 rutas PASS          |
| Layout local                 | 368 combinaciones PASS |

El primer E2E detectó que UTabs seleccionaba `0` por defecto al utilizar valores personalizados. Se corrigió con `default-value="users"` y se añadió una aserción de visibilidad de búsqueda al entrar. El reensayo completo específico pasó.

Evidencias [local-security-targeted.json](phase9/local-security-targeted.json), [local-security-recheck.json](phase9/local-security-recheck.json) y [local-review.json](phase9/local-review.json). Las bases temporales se eliminaron al finalizar los ensayos específicos.

## Regresión completa local

| Control                          | Resultado                                                 |
| -------------------------------- | --------------------------------------------------------- |
| Prisma format --check y validate | PASS                                                      |
| Lint, formato y TypeScript       | PASS                                                      |
| Vitest completo                  | 169 PASS en 26 archivos                                   |
| E2E completo, ejecución única    | 62 PASS                                                   |
| Visuales existentes              | 19 PASS                                                   |
| Build node-server                | PASS                                                      |
| Base temporal y schema           | Base eliminada, hashes de schema y 14 migraciones iguales |

La evidencia de la regresión está en [local-quality-gates.json](phase9/local-quality-gates.json). Las capturas privadas para inspección visual de Seguridad y su diálogo móvil se guardaron en el directorio ignorado logs.

Se comprobó además el JSON-LD de una ficha de servicio con un marcador inocuo en la base aislada de QA. El JSON-LD mantuvo su validez y el marcador permaneció inerte. Los registros de prueba se eliminaron. [Probe JSON-LD](phase9/local-jsonld-probe.json).

La deprecación pg identificada en la revisión inicial sigue apareciendo en la suite completa. Su traza y seguimiento permanecen en el informe de QA.

## Auditoría de dependencias y bloqueo de cierre

`pnpm audit --json` sobre el lockfile instalado reportó 3 avisos críticos, 35 altos, 32 moderados y 11 bajos. La evidencia contiene las rutas de dependencia y versiones afectadas. Estos son resultados del inventario de paquetes. La explotabilidad en la aplicación requiere atribución a sus rutas y configuración efectiva.

| Paquete crítico           | Instalado | Rango corregido informado | Cadena                          |
| ------------------------- | --------- | ------------------------- | ------------------------------- |
| `@simple-git/argv-parser` | 1.1.1     | >=2.0.1                   | Nuxt → DevTools → simple-git    |
| `simple-git`              | 3.36.0    | >=4.0.1                   | Nuxt → DevTools                 |
| `shell-quote`             | 1.10.0    | >=1.11.0                  | Nuxt → DevTools → launch-editor |

DevTools se habilita mediante la opción explícita `NUXT_DEVTOOLS=true`. El archivo de entorno local revisado mantiene esa opción deshabilitada. La evaluación de los avisos distinguirá alcance de desarrollo, herramientas y runtime.

Los avisos altos también incluyen dependencias de renderizado y procesamiento, entre ellas `@vue/server-renderer`, `devalue`, `sharp` y `zod`. La siguiente corrección requiere seleccionar versiones compatibles, evaluar alcance runtime/desarrollo, documentar riesgo y rollback, reinstalar con lockfile revisado y repetir gates.

El prompt maestro exige evaluar los upgrades mayores antes de aplicarlos. El resultado de esta revisión deja esa remediación como requisito previo a certificar fase 9.

[Inventario y avisos](phase9/local-dependencies.json).

## Criterio de cierre local

La pantalla de Seguridad y su flujo de cuentas están implementados. El cierre de fase 9 requiere resolver o justificar con evidencia la exposición de los avisos críticos/altos, completar el resto de aceptación local y registrar los gates finales de regresión.

El [informe de QA](phase9-qa-final-report.md) conserva el estado vigente y la continuidad del trabajo. La publicación y validación del deployment se evaluarán después de los cambios locales, conforme al alcance indicado por el usuario.
