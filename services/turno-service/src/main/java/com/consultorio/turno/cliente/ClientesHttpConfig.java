package com.consultorio.turno.cliente;

import java.net.http.HttpClient;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.web.client.RestClient;

import com.consultorio.turno.seguridad.ReenvioDeToken;

/**
 * Un RestClient por cada servicio al que llama Turno, todos con timeouts de conexión y lectura.
 * {@code @EnableResilientMethods} activa {@code @Retryable} (reintentos nativos de Spring Framework 7).
 */
@Configuration
@EnableResilientMethods
public class ClientesHttpConfig {

    @Bean
    RestClient pacienteRestClient(RestClient.Builder builder, ClientesProperties propiedades) {
        return crear(builder, propiedades, propiedades.pacienteUrl());
    }

    @Bean
    RestClient medicoRestClient(RestClient.Builder builder, ClientesProperties propiedades) {
        return crear(builder, propiedades, propiedades.medicoUrl());
    }

    @Bean
    RestClient especialidadRestClient(RestClient.Builder builder, ClientesProperties propiedades) {
        return crear(builder, propiedades, propiedades.especialidadUrl());
    }

    private static RestClient crear(RestClient.Builder builder, ClientesProperties propiedades, String urlBase) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(propiedades.timeoutConexion()).build();
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory(httpClient);
        fabrica.setReadTimeout(propiedades.timeoutLectura());
        // clone(): el builder auto-configurado es compartido; cada cliente necesita su propia URL base
        return builder.clone().baseUrl(urlBase).requestFactory(fabrica)
                .requestInterceptor(new ReenvioDeToken()) // la consulta se hace en nombre del mismo usuario
                .build();
    }
}
