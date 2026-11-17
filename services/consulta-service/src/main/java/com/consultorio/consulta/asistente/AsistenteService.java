package com.consultorio.consulta.asistente;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeoutException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import com.consultorio.consulta.asistente.DetectorConsultaClinica.Tipo;
import com.consultorio.consulta.asistente.DtosAsistente.MensajePrevio;
import com.consultorio.consulta.asistente.DtosAsistente.Origen;
import com.consultorio.consulta.asistente.DtosAsistente.Pregunta;
import com.consultorio.consulta.asistente.DtosAsistente.Respuesta;
import com.consultorio.consulta.asistente.DtosAsistente.Rol;

/**
 * Asistente del consultorio. Flujo de cada pregunta:
 * <ol>
 *   <li>Se ocultan datos personales del mensaje y del historial ({@link FiltroDatosPersonales}).</li>
 *   <li>Si la pregunta es clínica o una urgencia, se responde con un mensaje seguro fijo
 *       y NO se consulta al modelo ({@link DetectorConsultaClinica}).</li>
 *   <li>Si es administrativa, se envía al modelo local (Ollama) junto con las instrucciones de sistema.</li>
 * </ol>
 * Este servicio no tiene acceso a repositorios ni a otros servicios: no puede leer consultas,
 * historias clínicas ni datos de pacientes (lo verifica una prueba de arquitectura).
 */
@Service
public class AsistenteService {

    private static final Logger log = LoggerFactory.getLogger(AsistenteService.class);

    static final String RESPUESTA_CLINICA = """
            No puedo ayudarte con síntomas, diagnósticos, tratamientos ni medicamentos: \
            soy un asistente administrativo y no reemplazo la atención de un profesional de la salud.

            Te recomiendo consultar con un profesional. Podés pedir un turno desde la sección "Turnos" \
            con el botón "Nuevo turno", o comunicarte con la recepción del consultorio.

            Si los síntomas son intensos o empeoran, no esperes al turno: llamá al 107 o al 911, \
            o acudí a la guardia más cercana.""";

    static final String RESPUESTA_URGENCIA = """
            Lo que describís podría ser una urgencia. Llamá ahora al 107 (emergencias médicas) o al 911, \
            o acudí a la guardia más cercana. No esperes a un turno programado.

            Soy un asistente administrativo: no puedo evaluar síntomas ni dar indicaciones médicas.""";

    private final ChatClient chatClient;
    private final FiltroDatosPersonales filtro;
    private final DetectorConsultaClinica detector;
    private final EstadoOllama estadoOllama;
    private final AsistenteProperties propiedades;

    public AsistenteService(ChatClient chatClient, FiltroDatosPersonales filtro, DetectorConsultaClinica detector,
                            EstadoOllama estadoOllama, AsistenteProperties propiedades) {
        this.chatClient = chatClient;
        this.filtro = filtro;
        this.detector = detector;
        this.estadoOllama = estadoOllama;
        this.propiedades = propiedades;
    }

    public Respuesta responder(Pregunta pregunta) {
        if (!propiedades.habilitado()) {
            throw new AsistenteNoDisponibleException(
                    "El asistente está deshabilitado por configuración (ASISTENTE_HABILITADO=false).");
        }

        FiltroDatosPersonales.Resultado mensaje = filtro.anonimizar(pregunta.mensaje());

        Tipo tipo = detector.clasificar(mensaje.texto());
        if (tipo == Tipo.URGENCIA) {
            return new Respuesta(RESPUESTA_URGENCIA, Origen.REGLA_SEGURIDAD, mensaje.huboDatosOcultos());
        }
        if (tipo == Tipo.CLINICA) {
            return new Respuesta(RESPUESTA_CLINICA, Origen.REGLA_SEGURIDAD, mensaje.huboDatosOcultos());
        }

        List<Message> historial = new ArrayList<>();
        boolean huboDatosOcultos = mensaje.huboDatosOcultos();
        for (MensajePrevio previo : ultimos(pregunta.historial())) {
            FiltroDatosPersonales.Resultado limpio = filtro.anonimizar(previo.texto());
            huboDatosOcultos |= limpio.huboDatosOcultos();
            historial.add(previo.rol() == Rol.USUARIO
                    ? new UserMessage(limpio.texto())
                    : new AssistantMessage(limpio.texto()));
        }

        String texto;
        try {
            texto = chatClient.prompt()
                    .messages(historial)
                    .user(mensaje.texto())
                    .call()
                    .content();
        } catch (RuntimeException e) {
            throw traducirError(e);
        }
        if (texto == null || texto.isBlank()) {
            throw new AsistenteNoDisponibleException("El modelo no devolvió ninguna respuesta. Intentá nuevamente.");
        }
        return new Respuesta(texto.strip(), Origen.MODELO, huboDatosOcultos);
    }

    private List<MensajePrevio> ultimos(List<MensajePrevio> historial) {
        if (historial == null || historial.isEmpty()) {
            return List.of();
        }
        int desde = Math.max(0, historial.size() - propiedades.maxMensajesHistorial());
        return historial.subList(desde, historial.size());
    }

    /** Convierte errores técnicos de la llamada a Ollama en un motivo comprensible para la persona usuaria. */
    private AsistenteNoDisponibleException traducirError(RuntimeException e) {
        log.warn("Fallo al consultar el modelo de IA: {}", e.toString());
        String modelo = estadoOllama.getModelo();
        String mensajes = mensajesDeLaCadena(e).toLowerCase(Locale.ROOT);

        // El timeout se evalúa primero. Cada cliente HTTP usa su propia excepción (por ejemplo
        // ReadTimeoutException de Reactor Netty, que no hereda de las de Java), por eso también se
        // busca "Timeout" en el nombre de las clases de la cadena de causas.
        if (contieneCausa(e, SocketTimeoutException.class) || contieneCausa(e, HttpTimeoutException.class)
                || contieneCausa(e, TimeoutException.class) || algunaClaseContiene(e, "Timeout")
                || mensajes.contains("timed out")) {
            return new AsistenteNoDisponibleException(
                    "El modelo tardó demasiado en responder. Puede estar cargándose: esperá unos segundos y reintentá.");
        }
        if (contieneCausa(e, ConnectException.class) || mensajes.contains("connection refused")
                || mensajes.contains("connect")) {
            return new AsistenteNoDisponibleException("No se pudo conectar con Ollama en " + estadoOllama.getUrlOllama()
                    + ". Verificá que Ollama esté en ejecución.");
        }
        if (mensajes.contains("not found") && mensajes.contains("model")) {
            return new AsistenteNoDisponibleException("El modelo '" + modelo
                    + "' no está descargado en Ollama. Descargalo con: ollama pull " + modelo);
        }
        return new AsistenteNoDisponibleException("El asistente no pudo generar una respuesta en este momento.");
    }

    private static boolean contieneCausa(Throwable e, Class<? extends Throwable> tipo) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (tipo.isInstance(t)) {
                return true;
            }
        }
        return false;
    }

    private static boolean algunaClaseContiene(Throwable e, String fragmento) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t.getClass().getSimpleName().contains(fragmento)) {
                return true;
            }
        }
        return false;
    }

    private static String mensajesDeLaCadena(Throwable e) {
        StringBuilder sb = new StringBuilder();
        for (Throwable t = e; t != null; t = t.getCause()) {
            sb.append(t.getMessage()).append(' ');
        }
        return sb.toString();
    }
}
