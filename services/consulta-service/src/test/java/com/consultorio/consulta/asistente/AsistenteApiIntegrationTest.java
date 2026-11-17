package com.consultorio.consulta.asistente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.ConnectException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.http.HttpHeaders;
import com.consultorio.consulta.seguridad.TokensDePrueba;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import org.springframework.web.client.ResourceAccessException;

/**
 * Prueba la API del asistente con el contexto completo de Spring (incluida la auto-configuración
 * de Spring AI), reemplazando el modelo de Ollama por un modelo falso.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AsistenteApiIntegrationTest {

    @TestConfiguration
    static class ModeloDePrueba {
        @Bean
        @Primary
        ModeloFalso modeloFalso() {
            return new ModeloFalso();
        }
    }

    /** Pedidos hechos con un token real de un usuario PACIENTE (salvo que el test indique otro). */
    private MockMvc mvc;

    @Autowired
    void configurar(WebApplicationContext contexto) {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity())
                .defaultRequest(get("/").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("PACIENTE")))
                .build();
    }

    @Autowired
    private ModeloFalso modelo;

    @BeforeEach
    void reiniciar() {
        modelo.reiniciar();
    }

    @Test
    void respondePreguntasAdministrativasConElModelo() throws Exception {
        modelo.responder("Podés pedir un turno desde la sección Turnos.");

        mvc.perform(post("/api/asistente/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mensaje":"¿Cómo pido un turno? Mi DNI es 30111222",
                                 "historial":[{"rol":"USUARIO","texto":"Hola"},{"rol":"ASISTENTE","texto":"¡Hola!"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.respuesta").value("Podés pedir un turno desde la sección Turnos."))
                .andExpect(jsonPath("$.origen").value("MODELO"))
                .andExpect(jsonPath("$.datosPersonalesOcultados").value(true));

        assertThat(modelo.textoEnviado()).doesNotContain("30111222").contains("[DNI oculto]");
    }

    @Test
    void lasPreguntasSobreSintomasRecibenUnaRespuestaSeguraSinUsarElModelo() throws Exception {
        mvc.perform(post("/api/asistente/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mensaje\":\"Me duele la garganta, ¿qué antibiótico tomo?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.origen").value("REGLA_SEGURIDAD"));

        assertThat(modelo.recibidos()).isEmpty();
    }

    @Test
    void siOllamaNoEstaDisponibleDevuelve503ConElMotivo() throws Exception {
        modelo.fallarCon(new ResourceAccessException("I/O error", new ConnectException("Connection refused")));

        mvc.perform(post("/api/asistente/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mensaje\":\"¿Cuál es el horario?\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.servicio").value("asistente"))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Ollama")));
    }

    @Test
    void elEstadoInformaQueOllamaNoRespondeSinRomperElServicio() throws Exception {
        // En el perfil de pruebas Ollama apunta a http://localhost:1, donde no hay nada.
        mvc.perform(get("/api/asistente/estado"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habilitado").value(true))
                .andExpect(jsonPath("$.disponible").value(false))
                .andExpect(jsonPath("$.modelo").value("modelo-de-prueba:1b"))
                .andExpect(jsonPath("$.motivo").value(org.hamcrest.Matchers.containsString("No se pudo conectar con Ollama")));

        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void validaElMensaje() throws Exception {
        mvc.perform(post("/api/asistente/chat").contentType(MediaType.APPLICATION_JSON).content("{\"mensaje\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.mensaje").value("Escribí una pregunta"));
    }
}
