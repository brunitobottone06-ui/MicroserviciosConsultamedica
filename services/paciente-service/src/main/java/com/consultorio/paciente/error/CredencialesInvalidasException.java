package com.consultorio.paciente.error;

/** Se traduce a HTTP 401: usuario o contraseña incorrectos, o cuenta deshabilitada. */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}
