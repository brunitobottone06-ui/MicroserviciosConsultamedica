package com.consultorio.medico.api;

import java.util.List;

import com.consultorio.medico.dominio.Medico;

public record MedicoResponse(
        Long id,
        String nombre,
        String apellido,
        String matricula,
        String email,
        String telefono,
        boolean activo,
        List<Long> especialidadIds) {

    public static MedicoResponse desde(Medico m) {
        return new MedicoResponse(m.getId(), m.getNombre(), m.getApellido(), m.getMatricula(),
                m.getEmail(), m.getTelefono(), m.isActivo(),
                m.getEspecialidadIds().stream().sorted().toList());
    }
}
