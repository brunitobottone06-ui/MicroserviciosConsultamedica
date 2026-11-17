package com.consultorio.turno.cliente;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import com.consultorio.turno.error.ServicioNoDisponibleException;

/**
 * Lógica común para "traer un recurso por ID" desde otro microservicio:
 * <ul>
 *   <li>200 → el recurso</li>
 *   <li>404 → vacío (no existe)</li>
 *   <li>sin respuesta, timeout o 5xx → {@link ServicioNoDisponibleException} (que dispara el reintento)</li>
 * </ul>
 */
final class LlamadaRemota {

    private static final Logger log = LoggerFactory.getLogger(LlamadaRemota.class);

    private LlamadaRemota() {
    }

    static <T> Optional<T> obtenerPorId(RestClient cliente, String ruta, Long id, Class<T> tipo,
                                        String servicio, String nombreLegible) {
        try {
            return Optional.ofNullable(cliente.get().uri(ruta, id).retrieve().body(tipo));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            // 401: los servicios no comparten la misma JWT_SECRETO. 403: el usuario no puede ver ese dato.
            log.warn("El servicio {} rechazó la sesión reenviada ({})", servicio, e.getStatusCode());
            throw new AccessDeniedException("No tenés permiso para usar los datos de " + nombreLegible + " indicados.");
        } catch (ResourceAccessException | HttpServerErrorException e) {
            log.warn("Fallo al llamar al servicio {} ({}{}): {}", servicio, ruta, id, e.getMessage());
            throw new ServicioNoDisponibleException(servicio, "El servicio de " + nombreLegible
                    + " no está disponible en este momento. Intentá nuevamente en unos minutos.");
        }
    }
}
