package com.consultorio.turno.dominio;

/**
 * Ciclo de vida de un turno:
 * <pre>
 *   PROGRAMADO ──cancelar──▶ CANCELADO ──eliminar──▶ (se borra)
 *       │
 *       └──registrar consulta──▶ ATENDIDO
 * </pre>
 */
public enum EstadoTurno {
    PROGRAMADO,
    CANCELADO,
    ATENDIDO
}
