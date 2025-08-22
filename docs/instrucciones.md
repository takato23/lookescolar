Tarea: Implementar el sistema de carpetas decidido: Evento → (Nivel opcional) → Curso/Sala → Alumno → Fotos.
Reglas:

Clasificación: upload al Evento, luego mover a Curso/Sala y a Alumno (con apoyo de “foto-cartel” en Secundaria).

Secundaria: mantener experimento QR/código único por alumno en paralelo al método de cartel.

Sin duplicar archivos: las asociaciones son por DB.

Distribución por link tokenizado; evitar pedir que la familia escriba tokens.
Entrega: plan → diffs completos → migraciones → seeds → pasos de verificación y tests.

Alcance técnico mínimo (que Claude debería tocar)

DB/Migraciones

events, levels (opcional), courses/subjects, students, photos, relación photo ↔ student y/o photo ↔ course (grupales).

Índices por event_id, course_id, student_id.

Servicios

family.service: obtener galería por token (alumno) y grupales del curso.

storage.service: mover/etiquetar sin duplicar; previews con watermark.

Admin UI

Árbol navegable Evento → Curso/Sala → Alumno.

Subida masiva al Evento y acciones de mover a Curso y mover a Alumno (multi-select).

Botón Copiar link por alumno/curso.

Permisos

No exponer índices globales; acceso de familia solo por /f/[token].

Tests

Unit: asociaciones y mover sin duplicar.

Integration: obtener galería (alumno) y grupal (curso).

E2E: flujo admin “subir → clasificar → copiar link”.