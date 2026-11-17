package com.consultorio.consulta.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Datos editables de una consulta ya registrada (el turno asociado no se puede cambiar). */
public record ConsultaActualizacionRequest(
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
