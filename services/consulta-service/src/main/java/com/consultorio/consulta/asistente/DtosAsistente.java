package com.consultorio.consulta.asistente;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Objetos que entran y salen de la API del asistente. */
public final class DtosAsistente {

    private DtosAsistente() {
    }

    public enum Rol {
        USUARIO,
        ASISTENTE
    }

    /** Un mensaje previo de la conversación (la conversación vive en el navegador, no en el servidor). */
    public record MensajePrevio(
            @NotNull(message = "El rol del mensaje es obligatorio") Rol rol,
            @NotBlank(message = "El mensaje previo no puede estar vacío")
            @Size(max = 4000, message = "Un mensaje previo es demasiado largo") String texto) {
    }

    public record Pregunta(
            @NotBlank(message = "Escribí una pregunta")
            @Size(max = 1000, message = "La pregunta no puede superar los 1000 caracteres")
            String mensaje,

            @Size(max = 20, message = "El historial no puede tener más de 20 mensajes")
            List<@Valid MensajePrevio> historial) {
    }

    public enum Origen {
        /** La respuesta la generó el modelo de IA. */
        MODELO,
        /** Respuesta fija de seguridad: el mensaje NO se envió al modelo. */
        REGLA_SEGURIDAD
    }

    public record Respuesta(String respuesta, Origen origen, boolean datosPersonalesOcultados) {
    }

    public record Estado(boolean habilitado, boolean disponible, String modelo, String motivo) {
    }
}
