package com.consultorio.consulta.cliente;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Vista mínima de un turno, tal como la devuelve el servicio de Turnos. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TurnoRemoto(Long id, Long pacienteId, Long medicoId, Long especialidadId,
                          LocalDateTime fechaHora, String estado) {

    public boolean estaProgramado() {
        return "PROGRAMADO".equals(estado);
    }

    public boolean estaCancelado() {
        return "CANCELADO".equals(estado);
    }
}
