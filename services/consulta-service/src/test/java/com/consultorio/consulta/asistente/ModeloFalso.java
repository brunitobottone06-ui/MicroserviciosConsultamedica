package com.consultorio.consulta.asistente;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

/**
 * Modelo de IA falso para pruebas: registra cada Prompt recibido y devuelve una respuesta fija
 * (o lanza el error configurado). Permite verificar QUÉ se le enviaría al modelo real.
 */
public class ModeloFalso implements ChatModel {

    private final List<Prompt> recibidos = new ArrayList<>();
    private String respuesta = "Respuesta del modelo";
    private RuntimeException error;

    @Override
    public ChatResponse call(Prompt prompt) {
        recibidos.add(prompt);
        if (error != null) {
            throw error;
        }
        return new ChatResponse(List.of(new Generation(new AssistantMessage(respuesta))));
    }

    public void responder(String texto) {
        this.respuesta = texto;
        this.error = null;
    }

    public void fallarCon(RuntimeException e) {
        this.error = e;
    }

    public void reiniciar() {
        recibidos.clear();
        respuesta = "Respuesta del modelo";
        error = null;
    }

    public List<Prompt> recibidos() {
        return recibidos;
    }

    /** Todo el texto que recibió el modelo (system + historial + usuario), concatenado. */
    public String textoEnviado() {
        return recibidos.stream()
                .flatMap(p -> p.getInstructions().stream())
                .map(m -> m.getMessageType() + ": " + m.getText())
                .collect(Collectors.joining("\n"));
    }
}
