package com.consultorio.turno.seguridad;

import static com.consultorio.turno.seguridad.SeguridadComun.ADMINISTRATIVO;
import static com.consultorio.turno.seguridad.SeguridadComun.MEDICO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Reglas de acceso de turno-service. Ver, pedir y cancelar turnos lo puede hacer cualquier usuario
 * con sesión; si es un PACIENTE, TurnoService además verifica que el turno sea suyo.
 */
@Configuration
public class SeguridadConfig {

    @Bean
    SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        SeguridadComun.configurarBase(http);
        http.authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/turnos/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/turnos").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/turnos/*/cancelar").authenticated()
                // Marcar atendido: lo hace consulta-service en nombre del médico que registra la consulta
                .requestMatchers(HttpMethod.PATCH, "/api/turnos/*/atender").hasRole(MEDICO)
                // Reprogramar y eliminar: personal administrativo
                .requestMatchers("/api/turnos/**").hasRole(ADMINISTRATIVO)
                .anyRequest().authenticated());
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${seguridad.jwt.secreto:}") String secreto) {
        return SeguridadComun.decodificador(secreto);
    }
}
