package com.consultorio.consulta.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RelojConfig {

    /** Reloj con la zona horaria del consultorio (los contenedores usan UTC por defecto). */
    @Bean
    Clock reloj(@Value("${consultorio.zona-horaria:America/Argentina/Buenos_Aires}") String zonaHoraria) {
        return Clock.system(ZoneId.of(zonaHoraria));
    }
}
