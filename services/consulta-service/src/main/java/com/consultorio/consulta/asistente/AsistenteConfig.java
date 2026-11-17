package com.consultorio.consulta.asistente;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AsistenteConfig {

    /**
     * ChatClient de Spring AI configurado con las instrucciones del asistente.
     * El ChatClient.Builder lo crea Spring AI a partir del modelo de Ollama auto-configurado.
     * No se registran "tools" ni memoria: el modelo no puede consultar datos del sistema.
     */
    @Bean
    ChatClient chatClientAsistente(ChatClient.Builder builder, AsistenteProperties propiedades) {
        return builder.defaultSystem(PromptSistema.construir(propiedades)).build();
    }
}
