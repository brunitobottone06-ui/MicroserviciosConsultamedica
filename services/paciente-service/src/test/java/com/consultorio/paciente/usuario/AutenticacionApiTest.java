package com.consultorio.paciente.usuario;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * Inicio de sesión de punta a punta: tokens reales emitidos por el servicio y usados en los pedidos.
 * El administrador inicial lo crea InicializadorAdministrador con la clave del perfil de pruebas.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AutenticacionApiTest {

    private static final String REGISTRO = """
            {"paciente":{"nombre":"Lucía","apellido":"Romero","dni":"40123456","fechaNacimiento":"1997-01-05"},
             "clave":"clave-segura-1"}
            """;

    @Autowired
    private MockMvc mvc;

    private String login(String usuario, String clave) throws Exception {
        String json = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"%s\",\"clave\":\"%s\"}".formatted(usuario, clave)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(json, "$.token");
    }

    @Test
    void elAdministradorInicialPuedeIniciarSesionYUsarElToken() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"ADMIN\",\"clave\":\"clave-admin-de-prueba\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiraEn").isNotEmpty())
                .andExpect(jsonPath("$.usuario.rol").value("ADMINISTRATIVO"))
                .andExpect(jsonPath("$.usuario.claveHash").doesNotExist());

        String admin = login("admin", "clave-admin-de-prueba");
        mvc.perform(get("/api/pacientes").header(HttpHeaders.AUTHORIZATION, admin)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/yo").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(jsonPath("$.usuario").value("admin"));
    }

    @Test
    void credencialesIncorrectasDanElMismoMensajeExistaONoElUsuario() throws Exception {
        for (String cuerpo : new String[] {
                "{\"usuario\":\"admin\",\"clave\":\"incorrecta\"}", "{\"usuario\":\"no-existe\",\"clave\":\"x\"}"}) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.detail").value("Usuario o contraseña incorrectos."));
        }
    }

    @Test
    void unPacienteNuevoCreaSuCuentaYSoloVeSusPropiosDatos() throws Exception {
        String json = mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON).content(REGISTRO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.rol").value("PACIENTE"))
                .andExpect(jsonPath("$.usuario.usuario").value("40123456"))
                .andReturn().getResponse().getContentAsString();
        String token = "Bearer " + JsonPath.read(json, "$.token");
        Integer pacienteId = JsonPath.read(json, "$.usuario.pacienteId");

        mvc.perform(get("/api/pacientes/" + pacienteId).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dni").value("40123456"));
        mvc.perform(get("/api/pacientes/" + (pacienteId + 1000)).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Solo podés ver tus propios datos."));
        mvc.perform(get("/api/pacientes").header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/usuarios").header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isForbidden());

        // Puede volver a entrar con su DNI
        login("40123456", "clave-segura-1");
    }

    @Test
    void noSePuedeRegistrarUnDniExistente() throws Exception {
        mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON).content(REGISTRO))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON).content(REGISTRO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("pedí en recepción")));
    }

    @Test
    void elRegistroValidaLosDatosYLaContrasena() throws Exception {
        mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paciente\":{\"nombre\":\"\",\"dni\":\"1\"},\"clave\":\"corta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores['paciente.nombre']").value("El nombre es obligatorio"))
                .andExpect(jsonPath("$.errores['paciente.dni']").exists())
                .andExpect(jsonPath("$.errores.clave").value("La contraseña debe tener entre 8 y 72 caracteres"));
    }

    @Test
    void elAdministrativoCreaUnMedicoQuePuedeLeerPeroNoModificarPacientes() throws Exception {
        String admin = login("admin", "clave-admin-de-prueba");
        mvc.perform(post("/api/usuarios").header(HttpHeaders.AUTHORIZATION, admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"dra.gomez\",\"nombre\":\"Laura Gómez\",\"clave\":\"clave-medica-1\",\"rol\":\"MEDICO\"}"))
                .andExpect(status().isCreated());

        String medico = login("dra.gomez", "clave-medica-1");
        mvc.perform(get("/api/pacientes").header(HttpHeaders.AUTHORIZATION, medico)).andExpect(status().isOk());
        mvc.perform(post("/api/pacientes").header(HttpHeaders.AUTHORIZATION, medico).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"A\",\"apellido\":\"B\",\"dni\":\"30111222\",\"fechaNacimiento\":\"1990-01-01\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void recepcionHabilitaElAccesoDeUnPacienteYPuedeDeshabilitarlo() throws Exception {
        String admin = login("admin", "clave-admin-de-prueba");
        String json = mvc.perform(post("/api/pacientes").header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Ana\",\"apellido\":\"Torres\",\"dni\":\"30111222\",\"fechaNacimiento\":\"1983-04-12\"}"))
                .andReturn().getResponse().getContentAsString();
        Integer pacienteId = JsonPath.read(json, "$.id");

        String acceso = mvc.perform(post("/api/pacientes/" + pacienteId + "/acceso").header(HttpHeaders.AUTHORIZATION, admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"clave\":\"clave-inicial-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario").value("30111222"))
                .andReturn().getResponse().getContentAsString();
        login("30111222", "clave-inicial-1");

        Integer usuarioId = JsonPath.read(acceso, "$.id");
        mvc.perform(patch("/api/usuarios/" + usuarioId + "/desactivar").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(jsonPath("$.activo").value(false));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"30111222\",\"clave\":\"clave-inicial-1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("deshabilitado")));
    }

    @Test
    void unPacienteDadoDeBajaNoPuedeIniciarSesion() throws Exception {
        String json = mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON).content(REGISTRO))
                .andReturn().getResponse().getContentAsString();
        Integer pacienteId = JsonPath.read(json, "$.usuario.pacienteId");
        String admin = login("admin", "clave-admin-de-prueba");

        mvc.perform(delete("/api/pacientes/" + pacienteId).header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuario\":\"40123456\",\"clave\":\"clave-segura-1\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nadiePuedeDesactivarSuPropiaCuenta() throws Exception {
        String admin = login("admin", "clave-admin-de-prueba");
        String yo = mvc.perform(get("/api/auth/yo").header(HttpHeaders.AUTHORIZATION, admin))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(patch("/api/usuarios/" + JsonPath.read(yo, "$.id") + "/desactivar").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void sinSesionNoSeAccedeANada() throws Exception {
        mvc.perform(get("/api/pacientes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
    }
}
