package com.consultorio.medico.cliente;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Configuración de las llamadas HTTP a otros microservicios.
 *
 * @param timeoutConexion tiempo máximo para establecer la conexión
 * @param timeoutLectura  tiempo máximo esperando la respuesta
 * @param especialidadUrl URL base del servicio de especialidades
 */
@ConfigurationProperties(prefix = "clientes")
public record ClientesProperties(
        @DefaultValue("2s") Duration timeoutConexion,
        @DefaultValue("3s") Duration timeoutLectura,
        @DefaultValue("http://localhost:8083") String especialidadUrl) {
}
