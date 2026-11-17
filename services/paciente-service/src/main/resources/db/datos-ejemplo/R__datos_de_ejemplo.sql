-- Datos de ejemplo FICTICIOS para la demo local (no corresponden a personas reales).
INSERT INTO paciente (id, nombre, apellido, dni, fecha_nacimiento, email, telefono, obra_social, activo) VALUES
    (1, 'Ana', 'Torres', '30111222', '1983-04-12', 'ana.torres@correo.example', '011 5000-0001', 'OSDE', TRUE),
    (2, 'Carlos', 'Medina', '28999888', '1979-09-30', 'carlos.medina@correo.example', '011 5000-0002', NULL, TRUE),
    (3, 'Lucía', 'Romero', '40123456', '1997-01-05', NULL, '011 5000-0003', 'Swiss Medical', TRUE)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('paciente', 'id'), (SELECT MAX(id) FROM paciente));
