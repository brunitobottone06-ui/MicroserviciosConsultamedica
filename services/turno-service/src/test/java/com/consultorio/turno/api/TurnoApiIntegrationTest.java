package com.consultorio.turno.api;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.http.HttpHeaders;
import java.time.Instant;

import com.consultorio.turno.seguridad.TokensDePrueba;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import com.consultorio.turno.cliente.Remotos.EspecialidadRemota;
import com.consultorio.turno.cliente.Remotos.MedicoRemoto;
import com.consultorio.turno.cliente.Remotos.PacienteRemoto;
import com.consultorio.turno.cliente.ServiciosRemotosClient;
import com.consultorio.turno.error.ServicioNoDisponibleException;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TurnoApiIntegrationTest {

    /** Un martes dentro de dos semanas: siempre futuro y dentro del horario de atención. */
    private static final LocalDate MARTES = LocalDate.now().plusWeeks(1).with(TemporalAdjusters.next(DayOfWeek.TUESDAY));

    /** Pedidos hechos por un usuario ADMINISTRATIVO con token real (salvo que el test indique otro). */
    private MockMvc mvc;

    @Autowired
    void configurar(WebApplicationContext contexto) {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity())
                .defaultRequest(get("/").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("ADMINISTRATIVO")))
                .build();
    }

    private static String paciente(long id) {
        return "Bearer " + TokensDePrueba.token("PACIENTE", id, TokensDePrueba.SECRETO, Instant.now().plusSeconds(3600));
    }

    /** Simula los servicios de Pacientes, Médicos y Especialidades. */
    @MockitoBean
    private ServiciosRemotosClient remotos;

    @BeforeEach
    void serviciosRemotos() {
        when(remotos.buscarEspecialidad(anyLong())).thenReturn(Optional.empty());
        when(remotos.buscarMedico(anyLong())).thenReturn(Optional.empty());
        when(remotos.buscarPaciente(anyLong())).thenReturn(Optional.empty());
        when(remotos.buscarEspecialidad(3L)).thenReturn(Optional.of(new EspecialidadRemota(3L, "Cardiología", true)));
        when(remotos.buscarMedico(1L)).thenReturn(Optional.of(new MedicoRemoto(1L, "Laura", "Gómez", true, List.of(3L))));
        when(remotos.buscarPaciente(7L)).thenReturn(Optional.of(new PacienteRemoto(7L, "Ana", "Torres", true)));
        when(remotos.buscarPaciente(8L)).thenReturn(Optional.of(new PacienteRemoto(8L, "Carlos", "Medina", true)));
    }

    private static String cuerpo(long pacienteId, LocalDateTime fechaHora) {
        return """
                {"pacienteId":%d,"medicoId":1,"especialidadId":3,"fechaHora":"%s","duracionMinutos":30,"motivo":"Control"}
                """.formatted(pacienteId, fechaHora);
    }

    private String crear(long pacienteId, LocalTime hora) throws Exception {
        return mvc.perform(post("/api/turnos").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(pacienteId, MARTES.atTime(hora))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");
    }

    @Test
    void creaUnTurnoYLoListaConFiltros() throws Exception {
        String ubicacion = crear(7L, LocalTime.of(10, 0));

        mvc.perform(get(ubicacion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PROGRAMADO"))
                .andExpect(jsonPath("$.fechaHora").value(MARTES.atTime(10, 0) + ":00"))
                .andExpect(jsonPath("$.fechaHoraFin").value(MARTES.atTime(10, 30) + ":00"));

        mvc.perform(get("/api/turnos").param("pacienteId", "7").param("desde", MARTES.toString())
                        .param("hasta", MARTES.toString()))
                .andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/turnos").param("pacienteId", "8"))
                .andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/turnos").param("estado", "CANCELADO"))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void noPermiteDosTurnosSuperpuestosParaElMismoMedico() throws Exception {
        crear(7L, LocalTime.of(10, 0));

        mvc.perform(post("/api/turnos").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(8L, MARTES.atTime(10, 15))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "El médico ya tiene un turno programado de 10:00 a 10:30 que se superpone con el horario elegido"));

        // Un turno contiguo (10:30) sí está permitido
        crear(8L, LocalTime.of(10, 30));
    }

    @Test
    void unTurnoCanceladoLiberaElHorarioYLuegoPuedeEliminarse() throws Exception {
        String ubicacion = crear(7L, LocalTime.of(11, 0));

        mvc.perform(delete(ubicacion)).andExpect(status().isConflict());
        mvc.perform(patch(ubicacion + "/cancelar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CANCELADO"));

        crear(8L, LocalTime.of(11, 0));
        mvc.perform(delete(ubicacion)).andExpect(status().isNoContent());
        mvc.perform(get(ubicacion)).andExpect(status().isNotFound());
    }

    @Test
    void reprogramaUnTurnoSinChocarConsigoMismo() throws Exception {
        String ubicacion = crear(7L, LocalTime.of(12, 0));

        mvc.perform(put(ubicacion).contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(7L, MARTES.atTime(12, 15))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fechaHora").value(MARTES.atTime(12, 15) + ":00"));
    }

    @Test
    void unTurnoAtendidoNoPuedeModificarse() throws Exception {
        String ubicacion = crear(7L, LocalTime.of(13, 0));
        mvc.perform(patch(ubicacion + "/atender").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("MEDICO"))).andExpect(jsonPath("$.estado").value("ATENDIDO"));

        mvc.perform(put(ubicacion).contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(7L, MARTES.atTime(14, 0))))
                .andExpect(status().isConflict());
        mvc.perform(patch(ubicacion + "/cancelar")).andExpect(status().isConflict());
    }

    @Test
    void informaErroresDeValidacionYReferenciasInexistentes() throws Exception {
        mvc.perform(post("/api/turnos").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.pacienteId").value("Seleccioná un paciente"))
                .andExpect(jsonPath("$.errores.fechaHora").exists());

        mvc.perform(post("/api/turnos").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(99L, MARTES.atTime(15, 0))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("El paciente seleccionado no existe"));
    }

    @Test
    void siPacientesNoRespondeDevuelve503YNoCreaNada() throws Exception {
        when(remotos.buscarPaciente(7L)).thenThrow(new ServicioNoDisponibleException("pacientes",
                "El servicio de pacientes no está disponible en este momento. Intentá nuevamente en unos minutos."));

        mvc.perform(post("/api/turnos").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(7L, MARTES.atTime(16, 0))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.servicio").value("pacientes"));
        mvc.perform(get("/api/turnos")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void exponeElHorarioDeAtencion() throws Exception {
        mvc.perform(get("/api/turnos/horario"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apertura").value("08:00"))
                .andExpect(jsonPath("$.dias", hasSize(5)));
    }
}
