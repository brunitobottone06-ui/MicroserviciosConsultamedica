package com.consultorio.medico.cliente;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import com.consultorio.medico.error.ServicioNoDisponibleException;

/**
 * Cliente REST del servicio de especialidades.
 *
 * <p>Es una consulta GET (no modifica nada), por eso es seguro reintentarla: si el otro servicio
 * no responde o devuelve 5xx se reintenta hasta 2 veces con espera creciente (300 ms, 600 ms).
 * Un 404 no se reintenta: significa que la especialidad no existe.</p>
 */
@Component
public class EspecialidadClient {

    private static final Logger log = LoggerFactory.getLogger(EspecialidadClient.class);

    private final RestClient restClient;

    public EspecialidadClient(@Qualifier("especialidadRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    @Retryable(includes = ServicioNoDisponibleException.class, maxRetries = 2, delay = 300, multiplier = 2)
    public Optional<EspecialidadRemota> buscar(Long id) {
        try {
            return Optional.ofNullable(restClient.get()
                    .uri("/api/especialidades/{id}", id)
                    .retrieve()
                    .body(EspecialidadRemota.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            // 401: los servicios no comparten la misma JWT_SECRETO. 403: el rol no permite la consulta.
            log.warn("especialidad-service rechazó la sesión reenviada ({})", e.getStatusCode());
            throw new AccessDeniedException("El servicio de especialidades rechazó la sesión del usuario.");
        } catch (ResourceAccessException | HttpServerErrorException e) {
            log.warn("No se pudo consultar la especialidad {}: {}", id, e.getMessage());
            throw new ServicioNoDisponibleException("especialidades",
                    "El servicio de especialidades no está disponible en este momento. Intentá nuevamente en unos minutos.");
        }
    }
}
