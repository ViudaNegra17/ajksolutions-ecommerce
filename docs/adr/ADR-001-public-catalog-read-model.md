# ADR-001 — Frontera de lectura del catálogo público

**Fecha:** 2026-08-30  
**Estado:** aceptada

## Contexto

El modelo administrativo contiene costos, proveedores, reservas, auditoría y estados históricos que no deben llegar al navegador. A la vez, el portal necesita filtros dinámicos, disponibilidad por variante, SSR y SEO sin duplicar el catálogo en otra base.

## Decisión

El portal reutiliza PostgreSQL como única fuente de verdad, pero accede mediante Repository y Service públicos independientes. El Repository usa selects mínimos y filtros de visibilidad; el Service transforma los resultados a DTOs públicos, serializa Decimal, calcula precio/disponibilidad y aplica fallbacks SEO.

`CONTACT` se modela públicamente con importe nulo y queda al final del orden por precio. La disponibilidad publica una clasificación comercial, no los datos internos que la originan. La primera variante activa se selecciona automáticamente en el detalle.

No se agrega caché en Fase 3. La disponibilidad usa `no-store`; el resto puede recibir una estrategia de caché cuando haya métricas y reglas de invalidación.

## Consecuencias

- La base continúa siendo una única fuente de verdad.
- Cambios administrativos se reflejan sin sincronización adicional.
- Los DTOs impiden exponer accidentalmente relaciones sensibles.
- La API pública puede evolucionar sin acoplarse al formulario administrativo.
- Hay una pequeña duplicación deliberada de consultas/serializadores frente al módulo admin.
- Un caché futuro deberá invalidarse por producto, categoría, precio e inventario.
