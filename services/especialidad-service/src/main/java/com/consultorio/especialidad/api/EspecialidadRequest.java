package com.consultorio.especialidad.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Datos que envía el cliente para crear o editar una especialidad. */
public record EspecialidadRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String nombre,

        @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
        String descripcion) {
}
