package com.consultorio.consulta.asistente;

import com.consultorio.consulta.error.ServicioNoDisponibleException;

/** El asistente no puede responder (Ollama apagado, modelo no descargado, deshabilitado...). HTTP 503. */
public class AsistenteNoDisponibleException extends ServicioNoDisponibleException {

    public AsistenteNoDisponibleException(String motivo) {
        super("asistente", motivo);
    }
}
