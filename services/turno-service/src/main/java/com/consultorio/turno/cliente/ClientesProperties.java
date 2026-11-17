package com.consultorio.turno.cliente;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Configuración de las llamadas HTTP a otros microservicios (URLs y tiempos de espera). */
@ConfigurationProperties(prefix = "clientes")
public record ClientesProperties(
        @DefaultValue("2s") Duration timeoutConexion,
        @DefaultValue("3s") Duration timeoutLectura,
        @DefaultValue("http://localhost:8081") String pacienteUrl,
        @DefaultValue("http://localhost:8082") String medicoUrl,
        @DefaultValue("http://localhost:8083") String especialidadUrl) {
}
