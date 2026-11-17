package com.consultorio.paciente.seguridad;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** Datos del usuario que hizo el pedido, leídos del token JWT ya verificado. */
public record UsuarioActual(String usuario, String rol, Long pacienteId) {

    public static UsuarioActual obtener() {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken autenticacion) {
            Jwt jwt = autenticacion.getToken();
            Object paciente = jwt.getClaims().get("pacienteId");
            return new UsuarioActual(jwt.getSubject(), jwt.getClaimAsString("rol"),
                    paciente instanceof Number n ? n.longValue() : null);
        }
        return new UsuarioActual(null, null, null);
    }

    public boolean esPaciente() {
        return SeguridadComun.PACIENTE.equals(rol);
    }
}
