package com.consultorio.paciente.usuario;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Component;

import com.consultorio.paciente.seguridad.SeguridadComun;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * Crea el token JWT que recibe el usuario al iniciar sesión.
 *
 * <p>El token contiene: quién es (sub), su nombre, su rol y, si es paciente, el ID de su ficha.
 * Está firmado con JWT_SECRETO: nadie que no conozca esa clave puede fabricar o modificar un token.
 * Vence a las {@code seguridad.jwt.duracion} horas (8 h por defecto) y entonces hay que volver a ingresar.</p>
 */
@Component
public class EmisorDeTokens {

    public record TokenEmitido(String token, Instant expiraEn) {
    }

    private final NimbusJwtEncoder codificador;
    private final Duration duracion;
    private final Clock reloj;

    public EmisorDeTokens(@Value("${seguridad.jwt.secreto:}") String secreto,
                          @Value("${seguridad.jwt.duracion:8h}") Duration duracion) {
        this.codificador = new NimbusJwtEncoder(new ImmutableSecret<>(SeguridadComun.clave(secreto)));
        this.duracion = duracion;
        this.reloj = Clock.systemUTC();
    }

    public TokenEmitido emitir(Usuario usuario) {
        Instant ahora = reloj.instant();
        Instant vence = ahora.plus(duracion);
        JwtClaimsSet.Builder datos = JwtClaimsSet.builder()
                .issuer("consultorio")
                .subject(usuario.getUsuario())
                .issuedAt(ahora)
                .expiresAt(vence)
                .claim("nombre", usuario.getNombre())
                .claim("rol", usuario.getRol().name());
        if (usuario.getPacienteId() != null) {
            datos.claim("pacienteId", usuario.getPacienteId());
        }
        String token = codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), datos.build())).getTokenValue();
        return new TokenEmitido(token, vence);
    }
}
