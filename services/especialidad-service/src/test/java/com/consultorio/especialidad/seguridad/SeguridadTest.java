package com.consultorio.especialidad.seguridad;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Verifica las reglas de acceso con tokens JWT reales firmados con la clave de prueba. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SeguridadTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void sinTokenResponde401ConMensajeClaro() throws Exception {
        mvc.perform(get("/api/especialidades"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Tenés que iniciar sesión para usar esta función."));
    }

    @Test
    void elHealthCheckEsPublicoParaDockerCompose() throws Exception {
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
    }

    @Test
    void unPacientePuedeConsultarPeroNoModificar() throws Exception {
        mvc.perform(get("/api/especialidades").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("PACIENTE")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/especialidades").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("PACIENTE"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Neurología\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("No tenés permiso para realizar esta operación."));
    }

    @Test
    void unAdministrativoPuedeModificar() throws Exception {
        mvc.perform(post("/api/especialidades").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("ADMINISTRATIVO"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Neurología\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void rechazaTokensVencidosOFirmadosConOtraClave() throws Exception {
        String vencido = TokensDePrueba.token("ADMINISTRATIVO", null, TokensDePrueba.SECRETO, Instant.now().minusSeconds(120));
        String falsificado = TokensDePrueba.token("ADMINISTRATIVO", null,
                "otra-clave-distinta-que-no-conoce-el-servicio-123", Instant.now().plusSeconds(3600));

        mvc.perform(get("/api/especialidades").header(HttpHeaders.AUTHORIZATION, "Bearer " + vencido))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Tu sesión no es válida o expiró. Iniciá sesión nuevamente."));
        mvc.perform(get("/api/especialidades").header(HttpHeaders.AUTHORIZATION, "Bearer " + falsificado))
                .andExpect(status().isUnauthorized());
    }
}
