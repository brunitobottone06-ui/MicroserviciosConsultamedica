package com.consultorio.medico.api;

import java.util.Set;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Datos para crear o editar un médico. */
public record MedicoRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 80, message = "El nombre no puede superar los 80 caracteres")
        String nombre,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 80, message = "El apellido no puede superar los 80 caracteres")
        String apellido,

        @NotBlank(message = "La matrícula es obligatoria")
        @Pattern(regexp = "^[A-Za-z0-9 .\\-]{3,30}$",
                message = "La matrícula debe tener entre 3 y 30 caracteres (letras, números, espacios, puntos o guiones)")
        String matricula,

        @Email(message = "El email no tiene un formato válido")
        @Size(max = 120, message = "El email no puede superar los 120 caracteres")
        String email,

        @Pattern(regexp = "^$|^[0-9+()\\s\\-]{6,30}$",
                message = "El teléfono solo puede contener números, espacios, +, paréntesis o guiones (6 a 30 caracteres)")
        String telefono,

        @NotEmpty(message = "Seleccioná al menos una especialidad")
        Set<@NotNull @Positive Long> especialidadIds) {
}
