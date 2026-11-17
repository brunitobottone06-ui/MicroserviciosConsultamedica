package com.consultorio.paciente.seguridad;

import java.nio.charset.StandardCharsets;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Configuración de seguridad compartida por todos los microservicios (cada uno tiene su copia).
 *
 * <p>Cómo funciona: al iniciar sesión, paciente-service entrega un token JWT firmado con una clave
 * secreta (HS256). El navegador lo envía en cada pedido ({@code Authorization: Bearer ...}) y cada
 * servicio verifica la firma con la MISMA clave, sin tener que consultar a paciente-service.
 * El token incluye el rol del usuario (ADMINISTRATIVO, MEDICO o PACIENTE).</p>
 */
public final class SeguridadComun {

    public static final String ADMINISTRATIVO = "ADMINISTRATIVO";
    public static final String MEDICO = "MEDICO";
    public static final String PACIENTE = "PACIENTE";

    private SeguridadComun() {
    }

    /** Verificador de tokens: comprueba firma y vencimiento. */
    public static JwtDecoder decodificador(String secreto) {
        return NimbusJwtDecoder.withSecretKey(clave(secreto)).macAlgorithm(MacAlgorithm.HS256).build();
    }

    public static SecretKeySpec clave(String secreto) {
        if (secreto == null || secreto.length() < 32) {
            throw new IllegalStateException(
                    "Falta la variable JWT_SECRETO o es demasiado corta (mínimo 32 caracteres). Revisá el archivo .env");
        }
        return new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    /** API sin estado: sin sesiones ni CSRF (no hay cookies), autenticación solo por token. */
    public static void configurarBase(HttpSecurity http) {
        JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();
        roles.setAuthoritiesClaimName("rol");
        roles.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter conversor = new JwtAuthenticationConverter();
        conversor.setJwtGrantedAuthoritiesConverter(roles);

        http.csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(o -> o
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(conversor))
                        .authenticationEntryPoint((req, res, ex) -> responder(res, HttpStatus.UNAUTHORIZED,
                                "Sesión no válida", "Tu sesión no es válida o expiró. Iniciá sesión nuevamente.")))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> responder(res, HttpStatus.UNAUTHORIZED,
                                "Sesión requerida", "Tenés que iniciar sesión para usar esta función."))
                        .accessDeniedHandler((req, res, ex) -> responder(res, HttpStatus.FORBIDDEN,
                                "Acceso denegado", "No tenés permiso para realizar esta operación.")));
    }

    private static void responder(HttpServletResponse res, HttpStatus estado, String titulo, String detalle)
            throws java.io.IOException {
        res.setStatus(estado.value());
        res.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        res.getWriter().write("{\"status\":" + estado.value() + ",\"title\":\"" + titulo + "\",\"detail\":\"" + detalle + "\"}");
    }
}
