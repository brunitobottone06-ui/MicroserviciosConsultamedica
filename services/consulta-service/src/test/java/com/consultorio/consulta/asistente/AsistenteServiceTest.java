package com.consultorio.consulta.asistente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.ConnectException;
import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.web.client.ResourceAccessException;

import com.consultorio.consulta.asistente.DtosAsistente.MensajePrevio;
import com.consultorio.consulta.asistente.DtosAsistente.Origen;
import com.consultorio.consulta.asistente.DtosAsistente.Pregunta;
import com.consultorio.consulta.asistente.DtosAsistente.Rol;

class AsistenteServiceTest {

    private final ModeloFalso modelo = new ModeloFalso();
    private AsistenteService asistente;

    private static AsistenteProperties propiedades(boolean habilitado) {
        return new AsistenteProperties(habilitado, Duration.ofSeconds(1), 4, "Consultorio de Prueba",
                "lunes a viernes de 08:00 a 20:00", "la recepción");
    }

    private AsistenteService crear(boolean habilitado) {
        AsistenteProperties p = propiedades(habilitado);
        ChatClient chatClient = ChatClient.builder(modelo).defaultSystem(PromptSistema.construir(p)).build();
        EstadoOllama estado = mock(EstadoOllama.class);
        when(estado.getModelo()).thenReturn("llama3.2:3b");
        when(estado.getUrlOllama()).thenReturn("http://ollama:11434");
        return new AsistenteService(chatClient, new FiltroDatosPersonales(), new DetectorConsultaClinica(), estado, p);
    }

    @BeforeEach
    void preparar() {
        modelo.reiniciar();
        asistente = crear(true);
    }

    @Test
    void lasPreguntasAdministrativasSeRespondenConElModeloYLasReglasDelSistema() {
        modelo.responder("Atendemos de lunes a viernes de 8 a 20.");

        var respuesta = asistente.responder(new Pregunta("¿Qué horario tienen?", List.of()));

        assertThat(respuesta.origen()).isEqualTo(Origen.MODELO);
        assertThat(respuesta.respuesta()).isEqualTo("Atendemos de lunes a viernes de 8 a 20.");
        var mensajes = modelo.recibidos().getFirst().getInstructions();
        assertThat(mensajes.getFirst().getMessageType()).isEqualTo(MessageType.SYSTEM);
        assertThat(mensajes.getFirst().getText())
                .contains("Consultorio de Prueba", "Nunca des diagnósticos", "No tenés acceso a historias clínicas");
        assertThat(mensajes.getLast().getText()).isEqualTo("¿Qué horario tienen?");
    }

    @Test
    void nuncaEnviaDatosPersonalesAlModelo() {
        var respuesta = asistente.responder(new Pregunta(
                "Me llamo Ana Torres, DNI 30111222, ¿cómo cancelo mi turno? Mi mail es ana@correo.com",
                List.of(new MensajePrevio(Rol.USUARIO, "Mi teléfono es 011 4444-5555"),
                        new MensajePrevio(Rol.ASISTENTE, "¿En qué puedo ayudarte?"))));

        String enviado = modelo.textoEnviado();
        assertThat(enviado).doesNotContain("Ana Torres", "30111222", "ana@correo.com", "4444-5555");
        assertThat(respuesta.datosPersonalesOcultados()).isTrue();
    }

    @Test
    void lasPreguntasClinicasNoLleganAlModelo() {
        var respuesta = asistente.responder(new Pregunta("¿Qué medicamento tomo para la fiebre?", null));

        assertThat(respuesta.origen()).isEqualTo(Origen.REGLA_SEGURIDAD);
        assertThat(respuesta.respuesta()).contains("profesional de la salud", "Nuevo turno");
        assertThat(modelo.recibidos()).isEmpty();
    }

    @Test
    void anteUnaPosibleUrgenciaIndicaLlamarAEmergencias() {
        var respuesta = asistente.responder(new Pregunta("Tengo dolor de pecho y me falta el aire", null));

        assertThat(respuesta.origen()).isEqualTo(Origen.REGLA_SEGURIDAD);
        assertThat(respuesta.respuesta()).contains("107", "911");
        assertThat(modelo.recibidos()).isEmpty();
    }

    @Test
    void soloEnviaLosUltimosMensajesDelHistorial() {
        List<MensajePrevio> historial = List.of(
                new MensajePrevio(Rol.USUARIO, "uno"), new MensajePrevio(Rol.ASISTENTE, "dos"),
                new MensajePrevio(Rol.USUARIO, "tres"), new MensajePrevio(Rol.ASISTENTE, "cuatro"),
                new MensajePrevio(Rol.USUARIO, "cinco"), new MensajePrevio(Rol.ASISTENTE, "seis"));

        asistente.responder(new Pregunta("¿Y los sábados?", historial));

        // system + 4 mensajes de historial (máximo configurado) + pregunta actual
        assertThat(modelo.recibidos().getFirst().getInstructions()).hasSize(6);
        assertThat(modelo.textoEnviado()).doesNotContain(": uno", ": dos").contains("tres", "seis");
    }

    @Test
    void siOllamaNoRespondeExplicaElMotivo() {
        modelo.fallarCon(new ResourceAccessException("I/O error", new ConnectException("Connection refused")));

        assertThatThrownBy(() -> asistente.responder(new Pregunta("¿Cómo pido un turno?", null)))
                .isInstanceOf(AsistenteNoDisponibleException.class)
                .hasMessageContaining("No se pudo conectar con Ollama");
    }

    /** Imita io.netty.handler.timeout.ReadTimeoutException: no hereda de las excepciones de timeout de Java. */
    static class ReadTimeoutException extends RuntimeException {
    }

    @Test
    void siElModeloTardaDemasiadoLoExplicaAunqueLaExcepcionNoTengaMensaje() {
        // Caso real observado con Reactor Netty: "I/O error on POST request ...: null"
        modelo.fallarCon(new ResourceAccessException("I/O error on POST request for \"http://ollama:11434/api/chat\": null",
                new java.io.IOException(new ReadTimeoutException())));

        assertThatThrownBy(() -> asistente.responder(new Pregunta("¿Cómo pido un turno?", null)))
                .isInstanceOf(AsistenteNoDisponibleException.class)
                .hasMessageContaining("tardó demasiado");
    }

    @Test
    void siElModeloNoEstaDescargadoLoIndica() {
        modelo.fallarCon(new RuntimeException("404 Not Found: model \"llama3.2:3b\" not found, try pulling it first"));

        assertThatThrownBy(() -> asistente.responder(new Pregunta("¿Cómo pido un turno?", null)))
                .isInstanceOf(AsistenteNoDisponibleException.class)
                .hasMessageContaining("ollama pull llama3.2:3b");
    }

    @Test
    void siEstaDeshabilitadoNoRespondeNada() {
        AsistenteService deshabilitado = crear(false);

        assertThatThrownBy(() -> deshabilitado.responder(new Pregunta("Hola", null)))
                .isInstanceOf(AsistenteNoDisponibleException.class)
                .hasMessageContaining("deshabilitado");
        assertThat(modelo.recibidos()).isEmpty();
    }
}
