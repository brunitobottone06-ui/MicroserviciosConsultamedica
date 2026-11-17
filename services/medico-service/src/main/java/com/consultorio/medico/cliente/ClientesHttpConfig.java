package com.consultorio.medico.cliente;

import java.net.http.HttpClient;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.web.client.RestClient;

import com.consultorio.medico.seguridad.ReenvioDeToken;

/**
 * Crea los clientes REST hacia otros servicios con tiempos de espera (timeouts).
 * {@code @EnableResilientMethods} activa {@code @Retryable} (reintentos nativos de Spring Framework 7).
 */
@Configuration
@EnableResilientMethods
public class ClientesHttpConfig {

    @Bean
    RestClient especialidadRestClient(RestClient.Builder builder, ClientesProperties propiedades) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(propiedades.timeoutConexion()).build();
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory(httpClient);
        fabrica.setReadTimeout(propiedades.timeoutLectura());
        return builder.clone()
                .baseUrl(propiedades.especialidadUrl())
                .requestFactory(fabrica)
                .requestInterceptor(new ReenvioDeToken())
                .build();
    }
}
