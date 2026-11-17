package com.consultorio.medico.cliente;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Vista mínima de una especialidad, tal como la devuelve el servicio de especialidades. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EspecialidadRemota(Long id, String nombre, boolean activa) {
}
