package com.consultorio.paciente.seguridad;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/** Genera tokens JWT reales (firmados como lo hace paciente-service) para las pruebas. */
public final class TokensDePrueba {

    public static final String SECRETO = "clave-de-prueba-para-tests-de-al-menos-32-caracteres";

    private TokensDePrueba() {
    }

    public static String token(String rol, Long pacienteId, String secreto, Instant vence) {
        var codificador = new NimbusJwtEncoder(new ImmutableSecret<>(SeguridadComun.clave(secreto)));
        var datos = JwtClaimsSet.builder().issuer("consultorio").subject("usuario-prueba")
                .issuedAt(vence.minusSeconds(3600)).expiresAt(vence).claim("rol", rol).claim("nombre", "Prueba");
        if (pacienteId != null) {
            datos.claim("pacienteId", pacienteId);
        }
        return codificador.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), datos.build()))
                .getTokenValue();
    }

    public static String bearer(String rol) {
        return "Bearer " + token(rol, null, SECRETO, Instant.now().plusSeconds(3600));
    }
}
