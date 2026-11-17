package com.consultorio.turno.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConsultorioConfig {

    /** Reloj inyectable: permite fijar la fecha "actual" en las pruebas. */
    @Bean
    Clock reloj(ConsultorioProperties propiedades) {
        return Clock.system(ZoneId.of(propiedades.zonaHoraria()));
    }

    @Bean
    HorarioConsultorio horarioConsultorio(ConsultorioProperties propiedades) {
        return HorarioConsultorio.desde(propiedades);
    }
}
