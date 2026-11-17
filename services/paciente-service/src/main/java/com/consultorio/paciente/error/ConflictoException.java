package com.consultorio.paciente.error;

/** Se traduce a HTTP 409: la operación choca con el estado actual de los datos (p. ej. nombre duplicado). */
public class ConflictoException extends RuntimeException {

    public ConflictoException(String mensaje) {
        super(mensaje);
    }
}
