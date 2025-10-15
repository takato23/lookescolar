DB Query Audit Guide

Objetivo: medir antes de optimizar. Este playbook ayuda a identificar consultas lentas y proponer índices sin romper producción.

1) Activar y revisar métricas
- Supabase: habilitar/confirmar `pg_stat_statements` (Panel > Database > Extensions).
- Consultar top consultas por tiempo total:
  - `select query, calls, total_exec_time, mean_exec_time from pg_stat_statements order by total_exec_time desc limit 20;`

2) Medir endpoints críticos
- Focalizar en: `/api/admin/assets`, `/api/admin/folders`, listados con joins.
- Correr `EXPLAIN (ANALYZE, BUFFERS)` con parámetros reales (usar valores típicos de `folder_id`, `limit`, `offset`).
- Registrar resultados en este archivo (antes/después).

3) Hallazgos comunes y fixes
- Falta de índice filtro: crear índice parcial/compuesto. Ej: `create index concurrently on assets (folder_id, created_at desc);`
- Ordenaciones caras: agregar columna sort-friendly o índice con `desc` si aplica.
- N+1: revisar endpoints para incluir relaciones necesarias con una sola consulta.

4) Seguridad y despliegue
- Crear índices `concurrently` para no bloquear escrituras.
- Probar en branch de Supabase si es posible; luego migración a prod.
- Verificar plan tras crear índice: repetir `EXPLAIN` y validar menor coste.

5) Checklist de aceptación
- Tiempos p95 de endpoint bajan significativamente (objetivo 30–60%).
- No se rompen inserciones/actualizaciones durante creación de índices.
- Error rate estable; sin timeouts nuevos.
- Documentación de migración y rollback listos.

Notas
- No borrar índices existentes sin medir impacto.
- Evitar índices redundantes/completamente solapados.
