package com.consultorio.consulta;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ConsultaServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConsultaServiceApplication.class, args);
    }
}
