package com.consultorio.especialidad.api;

import com.consultorio.especialidad.dominio.Especialidad;

/** Representación de una especialidad que devuelve la API. */
public record EspecialidadResponse(Long id, String nombre, String descripcion, boolean activa) {

    public static EspecialidadResponse desde(Especialidad e) {
        return new EspecialidadResponse(e.getId(), e.getNombre(), e.getDescripcion(), e.isActiva());
    }
}
