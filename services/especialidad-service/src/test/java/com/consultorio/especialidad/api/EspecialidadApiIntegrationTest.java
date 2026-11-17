package com.consultorio.especialidad.api;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.consultorio.especialidad.seguridad.TokensDePrueba;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

/**
 * Prueba de integración: levanta el servicio completo (web + JPA + Flyway + seguridad) sobre H2.
 * Cada pedido se hace con un token de un usuario ADMINISTRATIVO (las reglas de acceso se prueban en SeguridadTest).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EspecialidadApiIntegrationTest {

    private MockMvc mvc;

    @Autowired
    void configurar(WebApplicationContext contexto) {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity())
                .defaultRequest(get("/").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("ADMINISTRATIVO")))
                .build();
    }

    @Test
    void creaConsultaYEditaUnaEspecialidad() throws Exception {
        String ubicacion = mvc.perform(post("/api/especialidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre": "Neurología", "descripcion": "Sistema nervioso"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.nombre").value("Neurología"))
                .andExpect(jsonPath("$.activa").value(true))
                .andReturn().getResponse().getHeader("Location");

        mvc.perform(put(ubicacion)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre": "Neurología infantil"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Neurología infantil"))
                .andExpect(jsonPath("$.descripcion").doesNotExist());

        mvc.perform(get(ubicacion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Neurología infantil"));
    }

    @Test
    void rechazaDatosInvalidosConMensajesPorCampo() throws Exception {
        mvc.perform(post("/api/especialidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre": "   "}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").value("El nombre es obligatorio"));
    }

    @Test
    void rechazaNombresDuplicadosSinImportarMayusculas() throws Exception {
        String cuerpo = """
                {"nombre": "Oftalmología"}
                """;
        mvc.perform(post("/api/especialidades").contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/especialidades").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre": "OFTALMOLOGÍA"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void laBajaLogicaOcultaLaEspecialidadDelListadoPorDefecto() throws Exception {
        String ubicacion = mvc.perform(post("/api/especialidades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre": "Reumatología"}
                                """))
                .andReturn().getResponse().getHeader("Location");

        mvc.perform(delete(ubicacion)).andExpect(status().isNoContent());

        mvc.perform(get("/api/especialidades"))
                .andExpect(jsonPath("$[*].nombre", not(hasItem("Reumatología"))));
        mvc.perform(get("/api/especialidades").param("incluirInactivas", "true"))
                .andExpect(jsonPath("$[*].nombre", hasItem("Reumatología")));
        mvc.perform(get(ubicacion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activa").value(false));
    }

    @Test
    void devuelve404ConMensajeClaroSiNoExiste() throws Exception {
        mvc.perform(get("/api/especialidades/12345"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("No existe la especialidad con ID 12345"));
    }
}
