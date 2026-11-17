package com.consultorio.turno.api;

import java.time.DayOfWeek;
import java.util.List;

import com.consultorio.turno.config.HorarioConsultorio;

/** Horario de atención, para que el frontend pueda mostrarlo y validar antes de enviar. */
public record HorarioResponse(String apertura, String cierre, List<DayOfWeek> dias, String descripcion) {

    public static HorarioResponse desde(HorarioConsultorio horario) {
        return new HorarioResponse(horario.getApertura().toString(), horario.getCierre().toString(),
                horario.getDias().stream().sorted().toList(), horario.descripcion());
    }
}
