package com.consultorio.consulta.asistente;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Configuración del asistente del consultorio.
 *
 * @param habilitado           permite apagar el asistente sin tocar el resto del servicio
 * @param timeoutVerificacion  tiempo máximo para comprobar si Ollama responde
 * @param maxMensajesHistorial cuántos mensajes previos de la conversación se envían como contexto
 * @param nombreConsultorio    nombre con el que se presenta el asistente
 * @param horario              texto del horario de atención (debe coincidir con el de turno-service)
 * @param contacto             cómo comunicarse con la recepción
 */
@ConfigurationProperties(prefix = "asistente")
public record AsistenteProperties(
        @DefaultValue("true") boolean habilitado,
        @DefaultValue("2s") Duration timeoutVerificacion,
        @DefaultValue("10") int maxMensajesHistorial,
        @DefaultValue("Consultorio Médico") String nombreConsultorio,
        @DefaultValue("lunes a viernes de 08:00 a 20:00") String horario,
        @DefaultValue("personalmente o por teléfono con la recepción del consultorio") String contacto) {
}
