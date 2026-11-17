package com.consultorio.medico.cliente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServiceUnavailable;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import com.consultorio.medico.seguridad.ReenvioDeToken;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.consultorio.medico.error.ServicioNoDisponibleException;

/**
 * Prueba el cliente REST con un servidor simulado (MockRestServiceServer), dentro de un contexto
 * de Spring mínimo para que {@code @Retryable} esté activo.
 */
@SpringJUnitConfig(EspecialidadClientTest.Config.class)
class EspecialidadClientTest {

    private static final String URL = "http://especialidades/api/especialidades/1";

    @Configuration
    @EnableResilientMethods
    static class Config {
        @Bean
        RestClient.Builder builder() {
            return RestClient.builder().baseUrl("http://especialidades");
        }

        @Bean
        MockRestServiceServer servidor(RestClient.Builder builder) {
            return MockRestServiceServer.bindTo(builder).build();
        }

        @Bean
        EspecialidadClient cliente(RestClient.Builder builder, MockRestServiceServer servidor) {
            return new EspecialidadClient(builder.requestInterceptor(new ReenvioDeToken()).build());
        }
    }

    @Test
    void reenviaElTokenDelUsuarioAlOtroServicio() {
        Jwt jwt = Jwt.withTokenValue("token-del-usuario").header("alg", "HS256").claim("rol", "ADMINISTRATIVO").build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
        try {
            servidor.expect(once(), requestTo(URL))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer token-del-usuario"))
                    .andRespond(withSuccess("{\"id\":1,\"nombre\":\"Clínica\",\"activa\":true}", MediaType.APPLICATION_JSON));

            assertThat(cliente.buscar(1L)).isPresent();
            servidor.verify();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void siElOtroServicioRechazaLaSesionSeInformaComoAccesoDenegado() {
        servidor.expect(once(), requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> cliente.buscar(1L)).isInstanceOf(AccessDeniedException.class);
    }

    @Autowired
    private MockRestServiceServer servidor;

    @Autowired
    private EspecialidadClient cliente;

    @BeforeEach
    void reiniciar() {
        servidor.reset();
    }

    @Test
    void devuelveLaEspecialidadCuandoExiste() {
        servidor.expect(once(), requestTo(URL)).andRespond(withSuccess(
                """
                {"id":1,"nombre":"Clínica médica","descripcion":"x","activa":true}
                """, MediaType.APPLICATION_JSON));

        assertThat(cliente.buscar(1L)).hasValueSatisfying(e -> {
            assertThat(e.nombre()).isEqualTo("Clínica médica");
            assertThat(e.activa()).isTrue();
        });
        servidor.verify();
    }

    @Test
    void un404SignificaQueNoExisteYNoSeReintenta() {
        servidor.expect(once(), requestTo(URL)).andRespond(withResourceNotFound());

        assertThat(cliente.buscar(1L)).isEmpty();
        servidor.verify();
    }

    @Test
    void siElServicioFallaReintentaDosVecesYLuegoInformaQueNoEstaDisponible() {
        servidor.expect(times(3), requestTo(URL)).andRespond(withServiceUnavailable());

        assertThatThrownBy(() -> cliente.buscar(1L))
                .isInstanceOf(ServicioNoDisponibleException.class)
                .hasMessageContaining("especialidades");
        servidor.verify();
    }

    @Test
    void unFalloTransitorioSeRecuperaConElReintento() {
        servidor.expect(once(), requestTo(URL)).andRespond(withServiceUnavailable());
        servidor.expect(once(), requestTo(URL)).andRespond(withSuccess(
                """
                {"id":1,"nombre":"Clínica médica","activa":true}
                """, MediaType.APPLICATION_JSON));

        assertThat(cliente.buscar(1L)).isPresent();
        servidor.verify();
    }
}
