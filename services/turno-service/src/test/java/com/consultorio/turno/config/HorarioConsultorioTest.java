package com.consultorio.turno.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

class HorarioConsultorioTest {

    private final HorarioConsultorio horario = HorarioConsultorio.desde(new ConsultorioProperties(
            "America/Argentina/Buenos_Aires", "08:00", "20:00",
            List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")));

    // 2030-03-04 es lunes; 2030-03-09 es sábado
    @Test
    void permiteTurnosDentroDelHorario() {
        assertThat(horario.permite(LocalDateTime.of(2030, 3, 4, 8, 0), LocalDateTime.of(2030, 3, 4, 8, 30))).isTrue();
        assertThat(horario.permite(LocalDateTime.of(2030, 3, 4, 19, 30), LocalDateTime.of(2030, 3, 4, 20, 0))).isTrue();
    }

    @Test
    void rechazaTurnosQueEmpiezanAntesOTerminanDespuesDelHorario() {
        assertThat(horario.permite(LocalDateTime.of(2030, 3, 4, 7, 45), LocalDateTime.of(2030, 3, 4, 8, 15))).isFalse();
        assertThat(horario.permite(LocalDateTime.of(2030, 3, 4, 19, 45), LocalDateTime.of(2030, 3, 4, 20, 15))).isFalse();
    }

    @Test
    void rechazaDiasSinAtencion() {
        assertThat(horario.permite(LocalDateTime.of(2030, 3, 9, 10, 0), LocalDateTime.of(2030, 3, 9, 10, 30))).isFalse();
    }

    @Test
    void describeElHorarioEnEspanol() {
        assertThat(horario.descripcion())
                .isEqualTo("lunes, martes, miércoles, jueves y viernes de 08:00 a 20:00");
    }
}
