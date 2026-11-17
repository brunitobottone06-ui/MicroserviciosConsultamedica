-- Datos de ejemplo para la demo local. Los IDs son fijos porque el servicio de médicos
-- (en otra base de datos) referencia a estas especialidades por ID en sus propios datos de ejemplo.
-- Es idempotente: si los registros ya existen, no hace nada.
INSERT INTO especialidad (id, nombre, descripcion, activa) VALUES
    (1, 'Clínica médica', 'Atención general de adultos y control de salud.', TRUE),
    (2, 'Pediatría', 'Atención de niñas, niños y adolescentes.', TRUE),
    (3, 'Cardiología', 'Prevención y control del sistema cardiovascular.', TRUE),
    (4, 'Dermatología', 'Atención de la piel, el pelo y las uñas.', TRUE),
    (5, 'Traumatología', 'Lesiones y enfermedades del sistema musculoesquelético.', TRUE)
ON CONFLICT DO NOTHING;

-- Ajusta el contador de IDs para que las nuevas especialidades no choquen con las de ejemplo.
SELECT setval(pg_get_serial_sequence('especialidad', 'id'), (SELECT MAX(id) FROM especialidad));
