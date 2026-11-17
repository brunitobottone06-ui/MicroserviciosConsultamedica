package com.consultorio.medico.seguridad;

import static com.consultorio.medico.seguridad.SeguridadComun.ADMINISTRATIVO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/** Reglas de acceso de medico-service. */
@Configuration
public class SeguridadConfig {

    @Bean
    SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        SeguridadComun.configurarBase(http);
        http.authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                // Cualquier usuario con sesión puede ver médicos (los pacientes los eligen al pedir turno)
                .requestMatchers(HttpMethod.GET, "/api/medicos/**").authenticated()
                .requestMatchers("/api/medicos/**").hasRole(ADMINISTRATIVO)
                .anyRequest().authenticated());
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${seguridad.jwt.secreto:}") String secreto) {
        return SeguridadComun.decodificador(secreto);
    }
}
