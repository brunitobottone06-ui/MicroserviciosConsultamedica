package com.consultorio.medico.api;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.consultorio.medico.seguridad.TokensDePrueba;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import com.consultorio.medico.cliente.EspecialidadClient;
import com.consultorio.medico.cliente.EspecialidadRemota;
import com.consultorio.medico.error.ServicioNoDisponibleException;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MedicoApiIntegrationTest {

    /** Pedidos hechos por un usuario ADMINISTRATIVO con token real. */
    private MockMvc mvc;

    @Autowired
    void configurar(WebApplicationContext contexto) {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity())
                .defaultRequest(get("/").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("ADMINISTRATIVO")))
                .build();
    }

    /** Simulamos el otro microservicio: en esta prueba no está levantado. */
    @MockitoBean
    private EspecialidadClient especialidadClient;

    @BeforeEach
    void especialidadesDisponibles() {
        when(especialidadClient.buscar(anyLong())).thenReturn(Optional.empty());
        when(especialidadClient.buscar(1L)).thenReturn(Optional.of(new EspecialidadRemota(1L, "Clínica médica", true)));
        when(especialidadClient.buscar(3L)).thenReturn(Optional.of(new EspecialidadRemota(3L, "Cardiología", true)));
        when(especialidadClient.buscar(4L)).thenReturn(Optional.of(new EspecialidadRemota(4L, "Dermatología", false)));
    }

    private String crearMedico(String matricula, String especialidades) throws Exception {
        return mvc.perform(post("/api/medicos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Laura","apellido":"Gómez","matricula":"%s",
                                 "email":"laura@consultorio.example","especialidadIds":%s}
                                """.formatted(matricula, especialidades)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");
    }

    @Test
    void creaUnMedicoConVariasEspecialidadesYLoFiltraPorEspecialidad() throws Exception {
        String ubicacion = crearMedico("MN 1", "[3, 1]");

        mvc.perform(get(ubicacion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.especialidadIds", contains(1, 3)))
                .andExpect(jsonPath("$.activo").value(true));

        mvc.perform(get("/api/medicos").param("especialidadId", "3"))
                .andExpect(jsonPath("$[*].matricula", hasItem("MN 1")));
        mvc.perform(get("/api/medicos").param("especialidadId", "2"))
                .andExpect(jsonPath("$[*].matricula", not(hasItem("MN 1"))));
    }

    @Test
    void rechazaEspecialidadesInexistentesOInactivas() throws Exception {
        mvc.perform(post("/api/medicos").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"A","apellido":"B","matricula":"MN 2","especialidadIds":[99]}
                                """))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("La especialidad con ID 99 no existe"));

        mvc.perform(post("/api/medicos").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"A","apellido":"B","matricula":"MN 3","especialidadIds":[4]}
                                """))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value(
                        "La especialidad 'Dermatología' está dada de baja y no puede asignarse"));
    }

    @Test
    void siEspecialidadesNoRespondeDevuelve503ConMensajeClaro() throws Exception {
        when(especialidadClient.buscar(1L)).thenThrow(
                new ServicioNoDisponibleException("especialidades", "El servicio de especialidades no está disponible"));

        mvc.perform(post("/api/medicos").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"A","apellido":"B","matricula":"MN 4","especialidadIds":[1]}
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.servicio").value("especialidades"));
    }

    @Test
    void validaCamposObligatoriosYFormatos() throws Exception {
        mvc.perform(post("/api/medicos").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"","apellido":"B","matricula":"x","email":"no-es-email","especialidadIds":[]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").exists())
                .andExpect(jsonPath("$.errores.matricula").exists())
                .andExpect(jsonPath("$.errores.email").value("El email no tiene un formato válido"))
                .andExpect(jsonPath("$.errores.especialidadIds").value("Seleccioná al menos una especialidad"));
    }

    @Test
    void noPermiteMatriculasDuplicadas() throws Exception {
        crearMedico("MN 5", "[1]");
        mvc.perform(post("/api/medicos").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Otro","apellido":"Médico","matricula":"mn 5","especialidadIds":[1]}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void alEditarNoRevalidaEspecialidadesQueYaTenia() throws Exception {
        String ubicacion = crearMedico("MN 6", "[1]");
        // La especialidad 1 pasa a estar dada de baja en el otro servicio...
        when(especialidadClient.buscar(1L)).thenReturn(Optional.of(new EspecialidadRemota(1L, "Clínica médica", false)));

        // ...pero igual se puede corregir el teléfono del médico.
        mvc.perform(put(ubicacion).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Laura","apellido":"Gómez","matricula":"MN 6","telefono":"011 5555-1234","especialidadIds":[1]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.telefono").value("011 5555-1234"));
    }

    @Test
    void unPacientePuedeVerMedicosPeroNoCrearlos() throws Exception {
        String paciente = TokensDePrueba.bearer("PACIENTE");
        mvc.perform(get("/api/medicos").header(HttpHeaders.AUTHORIZATION, paciente)).andExpect(status().isOk());
        mvc.perform(post("/api/medicos").header(HttpHeaders.AUTHORIZATION, paciente).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"A","apellido":"B","matricula":"MN 9","especialidadIds":[1]}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void sinSesionResponde401() throws Exception {
        mvc.perform(get("/api/medicos").header(HttpHeaders.AUTHORIZATION, "")).andExpect(status().isUnauthorized());
    }

    @Test
    void laBajaEsLogica() throws Exception {
        String ubicacion = crearMedico("MN 7", "[1]");

        mvc.perform(delete(ubicacion)).andExpect(status().isNoContent());

        mvc.perform(get(ubicacion)).andExpect(jsonPath("$.activo").value(false));
        mvc.perform(get("/api/medicos")).andExpect(jsonPath("$[*].matricula", not(hasItem("MN 7"))));
    }
}
