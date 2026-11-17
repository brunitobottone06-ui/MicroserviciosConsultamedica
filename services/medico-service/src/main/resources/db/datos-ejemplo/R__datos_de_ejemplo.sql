-- Datos de ejemplo (ficticios) para la demo local.
-- Los especialidad_id coinciden con los datos de ejemplo del servicio de especialidades.
INSERT INTO medico (id, nombre, apellido, matricula, email, telefono, activo) VALUES
    (1, 'Laura', 'Gómez', 'MN 10001', 'laura.gomez@consultorio.example', '011 4000-0001', TRUE),
    (2, 'Martín', 'Pérez', 'MN 10002', 'martin.perez@consultorio.example', '011 4000-0002', TRUE),
    (3, 'Sofía', 'Ruiz', 'MN 10003', 'sofia.ruiz@consultorio.example', '011 4000-0003', TRUE),
    (4, 'Diego', 'Fernández', 'MN 10004', 'diego.fernandez@consultorio.example', '011 4000-0004', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO medico_especialidad (medico_id, especialidad_id) VALUES
    (1, 1), (1, 3),
    (2, 2),
    (3, 4),
    (4, 5), (4, 1)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('medico', 'id'), (SELECT MAX(id) FROM medico));
