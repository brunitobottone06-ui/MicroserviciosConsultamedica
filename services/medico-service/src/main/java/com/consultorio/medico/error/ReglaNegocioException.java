package com.consultorio.medico.error;

/** Se traduce a HTTP 422: los datos tienen formato correcto pero violan una regla del negocio. */
public class ReglaNegocioException extends RuntimeException {

    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}
