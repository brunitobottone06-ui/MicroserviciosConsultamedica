package com.consultorio.paciente.api;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.http.HttpHeaders;

import com.consultorio.paciente.seguridad.TokensDePrueba;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PacienteApiIntegrationTest {

    /** Pedidos hechos por un usuario ADMINISTRATIVO con token real. */
    private MockMvc mvc;

    @Autowired
    void configurar(WebApplicationContext contexto) {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity())
                .defaultRequest(get("/").header(HttpHeaders.AUTHORIZATION, TokensDePrueba.bearer("ADMINISTRATIVO")))
                .build();
    }

    private String crear(String nombre, String apellido, String dni) throws Exception {
        return mvc.perform(post("/api/pacientes").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"%s","apellido":"%s","dni":"%s","fechaNacimiento":"1990-05-20",
                                 "email":"","telefono":"011 4444-5555","obraSocial":"OSDE"}
                                """.formatted(nombre, apellido, dni)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader("Location");
    }

    @Test
    void creaYConsultaUnPaciente() throws Exception {
        String ubicacion = crear("Ana", "Torres", "30111222");

        mvc.perform(get(ubicacion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dni").value("30111222"))
                .andExpect(jsonPath("$.fechaNacimiento").value("1990-05-20"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.activo").value(true));
    }

    @Test
    void buscaPorNombreApellidoODni() throws Exception {
        crear("Ana", "Torres", "30111222");
        crear("Carlos", "Medina", "28999888");

        mvc.perform(get("/api/pacientes").param("buscar", "torr"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].apellido").value("Torres"));
        mvc.perform(get("/api/pacientes").param("buscar", "28999"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].nombre").value("Carlos"));
        mvc.perform(get("/api/pacientes"))
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void validaDniFechaYEmail() throws Exception {
        String manana = LocalDate.now().plusDays(1).toString();
        mvc.perform(post("/api/pacientes").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Ana","apellido":"Torres","dni":"30.111.222",
                                 "fechaNacimiento":"%s","email":"mal@"}
                                """.formatted(manana)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.dni").value("El DNI debe tener 7 u 8 dígitos, sin puntos"))
                .andExpect(jsonPath("$.errores.fechaNacimiento").value("La fecha de nacimiento debe ser anterior a hoy"))
                .andExpect(jsonPath("$.errores.email").exists());
    }

    @Test
    void unaFechaConFormatoInvalidoDevuelveMensajeClaro() throws Exception {
        mvc.perform(post("/api/pacientes").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Ana","apellido":"Torres","dni":"30111222","fechaNacimiento":"20/05/1990"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Solicitud mal formada"));
    }

    @Test
    void noPermiteEditarConElDniDeOtroPaciente() throws Exception {
        crear("Ana", "Torres", "30111222");
        String otro = crear("Carlos", "Medina", "28999888");

        mvc.perform(put(otro).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Carlos","apellido":"Medina","dni":"30111222","fechaNacimiento":"1979-09-30"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Ya existe otro paciente con el DNI 30111222"));
    }

    @Test
    void bajaLogicaYReactivacion() throws Exception {
        String ubicacion = crear("Lucía", "Romero", "40123456");

        mvc.perform(delete(ubicacion)).andExpect(status().isNoContent());
        mvc.perform(get("/api/pacientes")).andExpect(jsonPath("$[*].dni", not(hasItem("40123456"))));
        mvc.perform(get("/api/pacientes").param("incluirInactivos", "true"))
                .andExpect(jsonPath("$[*].dni", hasItem("40123456")));

        mvc.perform(patch(ubicacion + "/reactivar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(true));
    }
}
