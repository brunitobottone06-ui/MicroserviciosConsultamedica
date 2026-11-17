package com.consultorio.consulta.seguridad;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Las consultas son datos clínicos: solo los médicos acceden. El asistente requiere sesión. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConsultaSeguridadTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void soloLosMedicosVenLasConsultas() throws Exception {
        mvc.perform(get("/api/consultas").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("MEDICO")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/consultas").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("ADMINISTRATIVO")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/consultas").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("PACIENTE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void elAsistenteRequiereSesionPeroLoPuedeUsarCualquierRol() throws Exception {
        mvc.perform(get("/api/asistente/estado")).andExpect(status().isUnauthorized());
        for (String rol : new String[] {"PACIENTE", "MEDICO", "ADMINISTRATIVO"}) {
            mvc.perform(get("/api/asistente/estado").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer(rol)))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void elHealthCheckSigueSiendoPublico() throws Exception {
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
    }
}
