package com.consultorio.consulta.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Datos para registrar la consulta de un turno. */
public record ConsultaRequest(
        @NotNull(message = "Seleccioná el turno atendido")
        @Positive(message = "El turno no es válido")
        Long turnoId,

        @NotBlank(message = "El motivo de consulta es obligatorio")
        @Size(max = 500, message = "El motivo no puede superar los 500 caracteres")
        String motivo,

        @Size(max = 2000, message = "El diagnóstico no puede superar los 2000 caracteres")
        String diagnostico,

        @Size(max = 2000, message = "El tratamiento no puede superar los 2000 caracteres")
        String tratamiento,

        @Size(max = 2000, message = "Las observaciones no pueden superar los 2000 caracteres")
        String observaciones) {
}
