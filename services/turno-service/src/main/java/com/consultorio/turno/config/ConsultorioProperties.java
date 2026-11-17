package com.consultorio.turno.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Configuración general del consultorio usada para validar turnos.
 *
 * @param zonaHoraria  zona horaria con la que se calcula "ahora" (los contenedores usan UTC por defecto)
 * @param apertura     hora de apertura, formato HH:mm
 * @param cierre       hora de cierre, formato HH:mm (un turno debe terminar como máximo a esta hora)
 * @param diasAtencion días de la semana en que se atiende (MONDAY, TUESDAY, ...)
 */
@ConfigurationProperties(prefix = "consultorio")
public record ConsultorioProperties(
        @DefaultValue("America/Argentina/Buenos_Aires") String zonaHoraria,
        @DefaultValue("08:00") String apertura,
        @DefaultValue("20:00") String cierre,
        @DefaultValue({"MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"}) List<String> diasAtencion) {
}
