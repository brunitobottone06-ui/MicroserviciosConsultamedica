package com.consultorio.turno.api;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Datos para solicitar o reprogramar un turno.
 * Que la fecha sea futura y dentro del horario se valida en el servicio, usando la zona horaria
 * del consultorio (no la del servidor).
 */
public record TurnoRequest(
        @NotNull(message = "Seleccioná un paciente")
        @Positive(message = "El paciente no es válido")
        Long pacienteId,

        @NotNull(message = "Seleccioná un médico")
        @Positive(message = "El médico no es válido")
        Long medicoId,

        @NotNull(message = "Seleccioná una especialidad")
        @Positive(message = "La especialidad no es válida")
        Long especialidadId,

        @NotNull(message = "La fecha y hora del turno son obligatorias")
        LocalDateTime fechaHora,

        @Min(value = 10, message = "La duración mínima es de 10 minutos")
        @Max(value = 120, message = "La duración máxima es de 120 minutos")
        Integer duracionMinutos,

        @Size(max = 255, message = "El motivo no puede superar los 255 caracteres")
        String motivo) {

    public static final int DURACION_POR_DEFECTO = 30;

    public int duracionEfectiva() {
        return duracionMinutos == null ? DURACION_POR_DEFECTO : duracionMinutos;
    }
}
