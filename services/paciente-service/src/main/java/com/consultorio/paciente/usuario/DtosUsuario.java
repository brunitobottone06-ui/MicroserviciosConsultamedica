package com.consultorio.paciente.usuario;

import java.time.Instant;

import com.consultorio.paciente.api.PacienteRequest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Objetos de entrada y salida de inicio de sesión y gestión de usuarios. */
public final class DtosUsuario {

    private DtosUsuario() {
    }

    public record LoginRequest(
            @NotBlank(message = "Ingresá tu usuario") String usuario,
            @NotBlank(message = "Ingresá tu contraseña") String clave) {
    }

    /** Registro de un paciente nuevo: sus datos personales y la contraseña elegida. Su usuario será su DNI. */
    public record RegistroRequest(
            @NotNull(message = "Faltan los datos del paciente") @Valid PacienteRequest paciente,
            @NotBlank(message = "Elegí una contraseña")
            @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
            String clave) {
    }

    /** Alta de una cuenta de personal (administrativo o médico). */
    public record NuevoUsuarioRequest(
            @NotBlank(message = "El usuario es obligatorio")
            @Pattern(regexp = "^[A-Za-z0-9._-]{3,60}$",
                    message = "El usuario debe tener entre 3 y 60 caracteres: letras, números, punto, guion o guion bajo")
            String usuario,
            @NotBlank(message = "El nombre es obligatorio")
            @Size(max = 120, message = "El nombre no puede superar los 120 caracteres")
            String nombre,
            @NotBlank(message = "La contraseña es obligatoria")
            @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
            String clave,
            @NotNull(message = "Elegí un rol") Rol rol) {
    }

    /** Habilitar el acceso web de un paciente ya cargado (lo hace recepción). */
    public record AccesoPacienteRequest(
            @NotBlank(message = "La contraseña inicial es obligatoria")
            @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
            String clave) {
    }

    public record UsuarioResponse(Long id, String usuario, String nombre, Rol rol, Long pacienteId, boolean activo) {
        public static UsuarioResponse desde(Usuario u) {
            return new UsuarioResponse(u.getId(), u.getUsuario(), u.getNombre(), u.getRol(), u.getPacienteId(), u.isActivo());
        }
    }

    public record SesionResponse(String token, Instant expiraEn, UsuarioResponse usuario) {
    }
}
