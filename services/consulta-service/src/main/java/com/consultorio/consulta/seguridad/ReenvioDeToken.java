package com.consultorio.consulta.seguridad;

import java.io.IOException;

import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Agrega a cada llamada hacia otro microservicio el mismo token del usuario que hizo el pedido
 * ("token relay"). Así el otro servicio aplica sus propias reglas de acceso a ese mismo usuario.
 */
public class ReenvioDeToken implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest pedido, byte[] cuerpo, ClientHttpRequestExecution ejecucion)
            throws IOException {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken jwt) {
            pedido.getHeaders().setBearerAuth(jwt.getToken().getTokenValue());
        }
        return ejecucion.execute(pedido, cuerpo);
    }
}
