package com.consultorio.consulta.seguridad;

import static com.consultorio.consulta.seguridad.SeguridadComun.MEDICO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Reglas de acceso de consulta-service. Las consultas contienen datos clínicos: solo las ven y
 * registran los médicos. El asistente lo puede usar cualquier usuario con sesión.
 */
@Configuration
public class SeguridadConfig {

    @Bean
    SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        SeguridadComun.configurarBase(http);
        http.authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/api/asistente/**").authenticated()
                .requestMatchers("/api/consultas/**").hasRole(MEDICO)
                .anyRequest().authenticated());
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${seguridad.jwt.secreto:}") String secreto) {
        return SeguridadComun.decodificador(secreto);
    }
}
