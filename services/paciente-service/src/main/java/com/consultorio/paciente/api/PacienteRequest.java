package com.consultorio.paciente.api;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Datos para crear o editar un paciente. */
public record PacienteRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 80, message = "El nombre no puede superar los 80 caracteres")
        String nombre,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 80, message = "El apellido no puede superar los 80 caracteres")
        String apellido,

        @NotBlank(message = "El DNI es obligatorio")
        @Pattern(regexp = "^\\d{7,8}$", message = "El DNI debe tener 7 u 8 dígitos, sin puntos")
        String dni,

        @NotNull(message = "La fecha de nacimiento es obligatoria")
        @Past(message = "La fecha de nacimiento debe ser anterior a hoy")
        LocalDate fechaNacimiento,

        @Email(message = "El email no tiene un formato válido")
        @Size(max = 120, message = "El email no puede superar los 120 caracteres")
        String email,

        @Pattern(regexp = "^$|^[0-9+()\\s\\-]{6,30}$",
                message = "El teléfono solo puede contener números, espacios, +, paréntesis o guiones (6 a 30 caracteres)")
        String telefono,

        @Size(max = 100, message = "La obra social no puede superar los 100 caracteres")
        String obraSocial) {
}
