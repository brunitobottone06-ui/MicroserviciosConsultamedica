package com.consultorio.paciente.seguridad;

import static com.consultorio.paciente.seguridad.SeguridadComun.ADMINISTRATIVO;
import static com.consultorio.paciente.seguridad.SeguridadComun.MEDICO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/** Reglas de acceso de paciente-service (que además emite los tokens de inicio de sesión). */
@Configuration
public class SeguridadConfig {

    @Bean
    SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        SeguridadComun.configurarBase(http);
        http.authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                // Públicos: iniciar sesión y que un paciente nuevo cree su cuenta
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/registro").permitAll()
                .requestMatchers("/api/auth/**").authenticated()
                .requestMatchers("/api/usuarios/**").hasRole(ADMINISTRATIVO)
                .requestMatchers(HttpMethod.POST, "/api/pacientes/*/acceso").hasRole(ADMINISTRATIVO)
                // El listado completo de pacientes es solo para el personal
                .requestMatchers(HttpMethod.GET, "/api/pacientes").hasAnyRole(ADMINISTRATIVO, MEDICO)
                // Una ficha: personal, o el propio paciente (se verifica en el controlador)
                .requestMatchers(HttpMethod.GET, "/api/pacientes/*").authenticated()
                .requestMatchers("/api/pacientes/**").hasRole(ADMINISTRATIVO)
                .anyRequest().authenticated());
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${seguridad.jwt.secreto:}") String secreto) {
        return SeguridadComun.decodificador(secreto);
    }

    /** Las contraseñas se guardan con BCrypt: un hash lento y con "sal", imposible de revertir. */
    @Bean
    PasswordEncoder codificadorDeClaves() {
        return new BCryptPasswordEncoder();
    }
}
