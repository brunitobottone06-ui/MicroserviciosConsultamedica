package com.consultorio.consulta.error;

/** Se traduce a HTTP 503: otro microservicio del que dependemos no respondió. */
public class ServicioNoDisponibleException extends RuntimeException {

    private final String servicio;

    public ServicioNoDisponibleException(String servicio, String mensaje) {
        super(mensaje);
        this.servicio = servicio;
    }

    public String getServicio() {
        return servicio;
    }
}
