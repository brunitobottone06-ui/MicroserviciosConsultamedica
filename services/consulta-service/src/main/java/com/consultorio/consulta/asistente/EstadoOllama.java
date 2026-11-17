package com.consultorio.consulta.asistente;

import java.net.http.HttpClient;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.consultorio.consulta.asistente.DtosAsistente.Estado;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Comprueba si el asistente puede funcionar: si Ollama responde y si el modelo configurado está
 * descargado. Usa la API de Ollama {@code GET /api/tags} (lista de modelos locales), con un
 * timeout corto para no demorar al frontend.
 */
@Component
public class EstadoOllama {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ModeloLocal(String name, String model) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ListaModelos(List<ModeloLocal> models) {
    }

    private final AsistenteProperties propiedades;
    private final String urlOllama;
    private final String modelo;
    private final RestClient restClient;

    public EstadoOllama(AsistenteProperties propiedades, RestClient.Builder builder,
                        @Value("${spring.ai.ollama.base-url:http://localhost:11434}") String urlOllama,
                        @Value("${spring.ai.ollama.chat.model}") String modelo) {
        this.propiedades = propiedades;
        this.urlOllama = urlOllama;
        this.modelo = modelo;
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(propiedades.timeoutVerificacion()).build();
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory(httpClient);
        fabrica.setReadTimeout(propiedades.timeoutVerificacion());
        this.restClient = builder.clone().baseUrl(urlOllama).requestFactory(fabrica).build();
    }

    public Estado consultar() {
        if (!propiedades.habilitado()) {
            return new Estado(false, false, modelo,
                    "El asistente está deshabilitado por configuración (ASISTENTE_HABILITADO=false).");
        }
        ListaModelos lista;
        try {
            lista = restClient.get().uri("/api/tags").retrieve().body(ListaModelos.class);
        } catch (RestClientException e) {
            return new Estado(true, false, modelo, "No se pudo conectar con Ollama en " + urlOllama
                    + ". Verificá que Ollama esté en ejecución (por ejemplo: docker compose --profile ia up -d).");
        }
        boolean descargado = lista != null && lista.models() != null && lista.models().stream()
                .anyMatch(m -> coincide(m.name()) || coincide(m.model()));
        if (!descargado) {
            return new Estado(true, false, modelo, "Ollama está en ejecución, pero el modelo '" + modelo
                    + "' no está descargado. Descargalo con: ollama pull " + modelo);
        }
        return new Estado(true, true, modelo, null);
    }

    public String getModelo() {
        return modelo;
    }

    public String getUrlOllama() {
        return urlOllama;
    }

    /** "llama3.2" equivale a "llama3.2:latest" en Ollama. */
    private boolean coincide(String nombre) {
        if (nombre == null) {
            return false;
        }
        String buscado = modelo.contains(":") ? modelo : modelo + ":latest";
        return Objects.equals(nombre, modelo) || Objects.equals(nombre, buscado);
    }
}
