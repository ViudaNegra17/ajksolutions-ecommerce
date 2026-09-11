# Runbook PostgreSQL — Backup y Restore

## Objetivos iniciales V1

- RPO objetivo: 24 horas hasta conocer volumen y criticidad reales.
- RTO objetivo: 4 horas para restaurar, migrar y validar una instancia única.
- No son promesas contractuales; deben revisarse después del primer mes operativo.

## Backup

1. Crear un directorio fuera del repositorio, con acceso solo para operación.
2. Obtener `DATABASE_URL` desde el secret store del entorno; nunca escribirla en scripts, logs o documentación.
3. Ejecutar `pg_dump --format=custom --no-owner --file=<ruta-segura>.dump <database-url>`.
4. Cifrar el dump antes de transferirlo; almacenar la clave en un sistema separado.
5. Registrar fecha, commit/tag, versión PostgreSQL, tamaño y checksum SHA-256.
6. Retención inicial: 7 diarios, 4 semanales y 6 mensuales; adaptar al proveedor y regulación aplicables.
7. Verificar diariamente que el archivo existe, no está vacío y su checksum coincide.

Los dumps, claves y manifests con DSN están excluidos del repositorio. El backup debe residir en almacenamiento distinto al host de aplicación y con acceso restringido/auditado.

## Restore drill seguro

1. Usar una máquina/cluster aislado y una base nueva; nunca restaurar sobre producción.
2. Crear la base destino: `createdb <drill_database>`.
3. Restaurar: `pg_restore --no-owner --exit-on-error --dbname=<drill_database> <backup.dump>`.
4. Ejecutar `prisma migrate status` contra la base restaurada.
5. Verificar presencia y conteos razonables de `_prisma_migrations`, `users`, `products`, `orders`, `tickets` e `inventory_stocks`.
6. Ejecutar smoke de lectura y, si es un entorno autorizado, las pruebas de integración.
7. Registrar duración, resultado, checksum y diferencias; destruir la base aislada y el dump temporal de trabajo.

## Evidencia 2026-09-10

Se ejecutó `pg_dump` custom con PostgreSQL 18 sobre `ajksolutions_ecommerce`, se restauró en `ajksolutions_phase8_restore_drill` y se verificaron 45 tablas, las 6 tablas esenciales, 12 migraciones, 1 usuario, 4 productos y 1 registro de inventario. Orders y Tickets tenían conteo 0, consistente con la fuente. La base drill y el dump temporal fueron eliminados; la base original no fue modificada.

## Recuperación y rollback

- Aplicación: volver al artefacto/tag anterior solo si es compatible con el schema ya desplegado.
- Schema: preferir migración forward-fix. No ejecutar SQL inverso destructivo sin precheck y backup probado.
- Pérdida/corrupción: aislar escrituras, preservar evidencia, restaurar el último backup válido, aplicar WAL/PITR si el proveedor lo soporta, ejecutar `migrate deploy` y repetir smoke.
- Criterio de reapertura: readiness 200, migraciones aplicadas, login admin y flujos PHYSICAL/DIGITAL/SERVICE controlados.
