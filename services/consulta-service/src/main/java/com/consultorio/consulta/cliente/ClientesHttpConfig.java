package com.consultorio.consulta.cliente;

import java.net.http.HttpClient;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.web.client.RestClient;

import com.consultorio.consulta.seguridad.ReenvioDeToken;

/**
 * Cliente REST hacia el servicio de Turnos, con timeouts cortos propios.
 * (El cliente de Ollama usa otros timeouts, más largos: ver application.yml.)
 * Se usa el HttpClient del JDK porque, a diferencia de HttpURLConnection, soporta PATCH.
 */
@Configuration
@EnableResilientMethods
public class ClientesHttpConfig {

    @Bean
    RestClient turnoRestClient(RestClient.Builder builder, ClientesProperties propiedades) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(propiedades.timeoutConexion()).build();
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory(httpClient);
        fabrica.setReadTimeout(propiedades.timeoutLectura());
        return builder.clone().baseUrl(propiedades.turnoUrl()).requestFactory(fabrica)
                .requestInterceptor(new ReenvioDeToken()) // turno-service verifica que quien registra sea MEDICO
                .build();
    }
}
