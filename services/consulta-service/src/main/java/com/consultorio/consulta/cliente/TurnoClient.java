package com.consultorio.consulta.cliente;

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

import com.consultorio.consulta.error.ConflictoException;
import com.consultorio.consulta.error.ServicioNoDisponibleException;

/**
 * Cliente REST del servicio de Turnos.
 *
 * <p>Ambas operaciones son seguras de reintentar: {@link #obtener} es una lectura y
 * {@link #marcarAtendido} es idempotente (marcar dos veces deja el mismo estado).</p>
 */
@Component
public class TurnoClient {

    private static final Logger log = LoggerFactory.getLogger(TurnoClient.class);
    private static final String NO_DISPONIBLE =
            "El servicio de turnos no está disponible en este momento. Intentá nuevamente en unos minutos.";

    private final RestClient restClient;

    public TurnoClient(@Qualifier("turnoRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    @Retryable(includes = ServicioNoDisponibleException.class, maxRetries = 2, delay = 300, multiplier = 2)
    public Optional<TurnoRemoto> obtener(Long turnoId) {
        try {
            return Optional.ofNullable(restClient.get()
                    .uri("/api/turnos/{id}", turnoId)
                    .retrieve()
                    .body(TurnoRemoto.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            throw sesionRechazada(e);
        } catch (ResourceAccessException | HttpServerErrorException e) {
            log.warn("No se pudo consultar el turno {}: {}", turnoId, e.getMessage());
            throw new ServicioNoDisponibleException("turnos", NO_DISPONIBLE);
        }
    }

    @Retryable(includes = ServicioNoDisponibleException.class, maxRetries = 2, delay = 300, multiplier = 2)
    public void marcarAtendido(Long turnoId) {
        try {
            restClient.patch()
                    .uri("/api/turnos/{id}/atender", turnoId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.Conflict e) {
            throw new ConflictoException("El servicio de turnos no permitió marcar el turno como atendido "
                    + "(probablemente fue cancelado)");
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            throw sesionRechazada(e);
        } catch (ResourceAccessException | HttpServerErrorException e) {
            log.warn("No se pudo marcar como atendido el turno {}: {}", turnoId, e.getMessage());
            throw new ServicioNoDisponibleException("turnos", NO_DISPONIBLE);
        }
    }

    /** 401: los servicios no comparten la misma JWT_SECRETO. 403: el rol del usuario no lo permite. */
    private static AccessDeniedException sesionRechazada(HttpClientErrorException e) {
        log.warn("turno-service rechazó la sesión reenviada ({})", e.getStatusCode());
        return new AccessDeniedException("El servicio de turnos rechazó la operación para tu usuario.");
    }
}
