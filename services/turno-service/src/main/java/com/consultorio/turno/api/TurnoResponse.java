package com.consultorio.turno.api;

import java.time.LocalDateTime;

import com.consultorio.turno.dominio.EstadoTurno;
import com.consultorio.turno.dominio.Turno;

public record TurnoResponse(
        Long id,
        Long pacienteId,
        Long medicoId,
        Long especialidadId,
        LocalDateTime fechaHora,
        LocalDateTime fechaHoraFin,
        int duracionMinutos,
        EstadoTurno estado,
        String motivo,
        LocalDateTime creadoEn) {

    public static TurnoResponse desde(Turno t) {
        return new TurnoResponse(t.getId(), t.getPacienteId(), t.getMedicoId(), t.getEspecialidadId(),
                t.getFechaHora(), t.getFechaHoraFin(), t.getDuracionMinutos(), t.getEstado(), t.getMotivo(),
                t.getCreadoEn());
    }
}
