package com.consultorio.consulta.api;

import java.time.LocalDateTime;

import com.consultorio.consulta.dominio.Consulta;

public record ConsultaResponse(
        Long id,
        Long turnoId,
        Long pacienteId,
        Long medicoId,
        Long especialidadId,
        LocalDateTime fechaTurno,
        LocalDateTime registradaEn,
        String motivo,
        String diagnostico,
        String tratamiento,
        String observaciones) {

    public static ConsultaResponse desde(Consulta c) {
        return new ConsultaResponse(c.getId(), c.getTurnoId(), c.getPacienteId(), c.getMedicoId(),
                c.getEspecialidadId(), c.getFechaTurno(), c.getRegistradaEn(), c.getMotivo(),
                c.getDiagnostico(), c.getTratamiento(), c.getObservaciones());
    }
}
