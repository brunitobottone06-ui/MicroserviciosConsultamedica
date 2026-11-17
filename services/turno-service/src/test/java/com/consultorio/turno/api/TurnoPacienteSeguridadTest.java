package com.consultorio.turno.api;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.consultorio.turno.cliente.Remotos.EspecialidadRemota;
import com.consultorio.turno.cliente.Remotos.MedicoRemoto;
import com.consultorio.turno.cliente.Remotos.PacienteRemoto;
import com.consultorio.turno.cliente.ServiciosRemotosClient;
import com.consultorio.turno.seguridad.TokensDePrueba;
import com.jayway.jsonpath.JsonPath;

/** Un paciente solo puede ver, pedir y cancelar SUS turnos, aunque manipule el pedido. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TurnoPacienteSeguridadTest {

    private static final LocalDate MARTES = LocalDate.now().plusWeeks(1).with(TemporalAdjusters.next(DayOfWeek.TUESDAY));
    private static final String ANA = token("PACIENTE", 7L);
    private static final String CARLOS = token("PACIENTE", 8L);
    private static final String ADMIN = token("ADMINISTRATIVO", null);

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ServiciosRemotosClient remotos;

    private static String token(String rol, Long pacienteId) {
        return "Bearer " + TokensDePrueba.token(rol, pacienteId, TokensDePrueba.SECRETO, Instant.now().plusSeconds(3600));
    }

    @BeforeEach
    void serviciosRemotos() {
        when(remotos.buscarEspecialidad(anyLong())).thenReturn(Optional.of(new EspecialidadRemota(3L, "Cardiología", true)));
        when(remotos.buscarMedico(anyLong())).thenReturn(Optional.of(new MedicoRemoto(1L, "Laura", "Gómez", true, List.of(3L))));
        when(remotos.buscarPaciente(7L)).thenReturn(Optional.of(new PacienteRemoto(7L, "Ana", "Torres", true)));
        when(remotos.buscarPaciente(8L)).thenReturn(Optional.of(new PacienteRemoto(8L, "Carlos", "Medina", true)));
    }

    private String pedir(String token, long pacienteId, int hora) throws Exception {
        return mvc.perform(post("/api/turnos").header(HttpHeaders.AUTHORIZATION, token).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"pacienteId":%d,"medicoId":1,"especialidadId":3,"fechaHora":"%sT%02d:00"}
                                """.formatted(pacienteId, MARTES, hora)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void unPacientePideSuTurnoPeroNoPuedePedirParaOtro() throws Exception {
        pedir(ANA, 7, 10);

        mvc.perform(post("/api/turnos").header(HttpHeaders.AUTHORIZATION, ANA).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"pacienteId":8,"medicoId":1,"especialidadId":3,"fechaHora":"%sT11:00"}
                                """.formatted(MARTES)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Solo podés pedir turnos para vos."));
    }

    @Test
    void elListadoDeUnPacienteSoloTraeSusTurnosAunqueFiltrePorOtro() throws Exception {
        pedir(ANA, 7, 10);
        pedir(CARLOS, 8, 11);

        mvc.perform(get("/api/turnos").param("pacienteId", "8").header(HttpHeaders.AUTHORIZATION, ANA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[*].pacienteId", everyItem(is(7))));
        mvc.perform(get("/api/turnos").header(HttpHeaders.AUTHORIZATION, ADMIN))
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void unPacienteNoVeNiCancelaTurnosAjenos() throws Exception {
        Integer idDeCarlos = JsonPath.read(pedir(CARLOS, 8, 12), "$.id");

        mvc.perform(get("/api/turnos/" + idDeCarlos).header(HttpHeaders.AUTHORIZATION, ANA))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/turnos/" + idDeCarlos + "/cancelar").header(HttpHeaders.AUTHORIZATION, ANA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Solo podés cancelar tus propios turnos."));
        mvc.perform(patch("/api/turnos/" + idDeCarlos + "/cancelar").header(HttpHeaders.AUTHORIZATION, CARLOS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CANCELADO"));
    }

    @Test
    void unPacienteNoPuedeReprogramarNiMarcarAtendido() throws Exception {
        Integer id = JsonPath.read(pedir(ANA, 7, 14), "$.id");

        mvc.perform(put("/api/turnos/" + id).header(HttpHeaders.AUTHORIZATION, ANA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pacienteId\":7,\"medicoId\":1,\"especialidadId\":3,\"fechaHora\":\"%sT15:00\"}".formatted(MARTES)))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/turnos/" + id + "/atender").header(HttpHeaders.AUTHORIZATION, ANA))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/turnos/" + id + "/atender").header(HttpHeaders.AUTHORIZATION, ADMIN))
                .andExpect(status().isForbidden());
    }

    @Test
    void sinSesionResponde401() throws Exception {
        mvc.perform(get("/api/turnos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/turnos/horario")).andExpect(status().isUnauthorized());
    }
}
