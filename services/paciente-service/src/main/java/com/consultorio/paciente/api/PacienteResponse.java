package com.consultorio.paciente.api;

import java.time.LocalDate;

import com.consultorio.paciente.dominio.Paciente;

public record PacienteResponse(
        Long id,
        String nombre,
        String apellido,
        String dni,
        LocalDate fechaNacimiento,
        String email,
        String telefono,
        String obraSocial,
        boolean activo) {

    public static PacienteResponse desde(Paciente p) {
        return new PacienteResponse(p.getId(), p.getNombre(), p.getApellido(), p.getDni(),
                p.getFechaNacimiento(), p.getEmail(), p.getTelefono(), p.getObraSocial(), p.isActivo());
    }
}
