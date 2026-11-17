package com.consultorio.turno.cliente;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Vistas mínimas de los datos de otros servicios. Turno solo lee lo que necesita para validar
 * (existencia, estado activo y especialidades del médico); no guarda ni copia datos personales.
 */
public final class Remotos {

    private Remotos() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PacienteRemoto(Long id, String nombre, String apellido, boolean activo) {
        public String nombreCompleto() {
            return nombre + " " + apellido;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MedicoRemoto(Long id, String nombre, String apellido, boolean activo, List<Long> especialidadIds) {
        public String nombreCompleto() {
            return nombre + " " + apellido;
        }

        public boolean atiende(Long especialidadId) {
            return especialidadIds != null && especialidadIds.contains(especialidadId);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EspecialidadRemota(Long id, String nombre, boolean activa) {
    }
}
