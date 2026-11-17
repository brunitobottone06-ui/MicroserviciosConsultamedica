package com.consultorio.consulta.api;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.http.HttpHeaders;
import com.consultorio.consulta.seguridad.TokensDePrueba;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import com.consultorio.consulta.cliente.TurnoClient;
import com.consultorio.consulta.cliente.TurnoRemoto;
import com.consultorio.consulta.dominio.ConsultaRepository;
import com.consultorio.consulta.error.ServicioNoDisponibleException;

/**
 * Sin @Transactional a propósito: así se comprueba el rollback REAL cuando falla el servicio de Turnos.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConsultaApiIntegrationTest {

    private static final LocalDateTime FECHA = LocalDateTime.of(2030, 3, 5, 10, 0);

    /** Pedidos hechos con un token real de un usuario MEDICO (salvo que el test indique otro). */
    private MockMvc mvc;

    @Autowired
    void configurar(WebApplicationContext contexto) {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity())
                .defaultRequest(get("/").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("MEDICO")))
                .build();
    }

    @Autowired
    private ConsultaRepository repository;

    @MockitoBean
    private TurnoClient turnoClient;

    @BeforeEach
    void turnos() {
        when(turnoClient.obtener(anyLong())).thenReturn(Optional.empty());
        when(turnoClient.obtener(10L)).thenReturn(Optional.of(new TurnoRemoto(10L, 7L, 1L, 3L, FECHA, "PROGRAMADO")));
        when(turnoClient.obtener(11L)).thenReturn(Optional.of(new TurnoRemoto(11L, 8L, 1L, 3L, FECHA, "PROGRAMADO")));
    }

    @AfterEach
    void limpiar() {
        repository.deleteAll();
    }

    private static String cuerpo(long turnoId) {
        return """
                {"turnoId":%d,"motivo":"Control","diagnostico":"Sin hallazgos","tratamiento":"","observaciones":null}
                """.formatted(turnoId);
    }

    @Test
    void registraEditaListaYEliminaUnaConsulta() throws Exception {
        String ubicacion = mvc.perform(post("/api/consultas").contentType(MediaType.APPLICATION_JSON).content(cuerpo(10)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pacienteId").value(7))
                .andExpect(jsonPath("$.tratamiento").doesNotExist())
                .andReturn().getResponse().getHeader("Location");

        mvc.perform(put(ubicacion).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"motivo":"Control anual","diagnostico":"Sin hallazgos","tratamiento":"Hábitos saludables"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tratamiento").value("Hábitos saludables"));

        mvc.perform(get("/api/consultas").param("pacienteId", "7")).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/consultas").param("pacienteId", "8")).andExpect(jsonPath("$", hasSize(0)));

        mvc.perform(delete(ubicacion)).andExpect(status().isNoContent());
        mvc.perform(get(ubicacion)).andExpect(status().isNotFound());
    }

    @Test
    void noPermiteDosConsultasParaElMismoTurno() throws Exception {
        mvc.perform(post("/api/consultas").contentType(MediaType.APPLICATION_JSON).content(cuerpo(10)))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/consultas").contentType(MediaType.APPLICATION_JSON).content(cuerpo(10)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Ese turno ya tiene una consulta registrada"));
    }

    @Test
    void siTurnosFallaAlConfirmarNoQuedaUnaConsultaHuerfana() throws Exception {
        doThrow(new ServicioNoDisponibleException("turnos", "El servicio de turnos no está disponible"))
                .when(turnoClient).marcarAtendido(11L);

        mvc.perform(post("/api/consultas").contentType(MediaType.APPLICATION_JSON).content(cuerpo(11)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.servicio").value("turnos"));

        mvc.perform(get("/api/consultas").param("turnoId", "11")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void validaLosDatosYElTurno() throws Exception {
        mvc.perform(post("/api/consultas").contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.turnoId").value("Seleccioná el turno atendido"))
                .andExpect(jsonPath("$.errores.motivo").value("El motivo de consulta es obligatorio"));

        mvc.perform(post("/api/consultas").contentType(MediaType.APPLICATION_JSON).content(cuerpo(99)))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("El turno seleccionado no existe"));
    }
}
