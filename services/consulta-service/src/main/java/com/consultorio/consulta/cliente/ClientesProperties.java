package com.consultorio.consulta.cliente;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Configuración de las llamadas HTTP al servicio de Turnos. */
@ConfigurationProperties(prefix = "clientes")
public record ClientesProperties(
        @DefaultValue("2s") Duration timeoutConexion,
        @DefaultValue("3s") Duration timeoutLectura,
        @DefaultValue("http://localhost:8084") String turnoUrl) {
}
