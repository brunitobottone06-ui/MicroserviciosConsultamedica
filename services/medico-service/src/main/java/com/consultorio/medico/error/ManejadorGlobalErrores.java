package com.consultorio.medico.error;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Convierte las excepciones en respuestas JSON con formato "Problem Details" (RFC 9457),
 * con un mensaje claro en español en el campo "detail".
 */
@RestControllerAdvice
public class ManejadorGlobalErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorGlobalErrores.class);

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ProblemDetail noEncontrado(RecursoNoEncontradoException ex) {
        return problema(HttpStatus.NOT_FOUND, "Recurso no encontrado", ex.getMessage());
    }

    @ExceptionHandler(ConflictoException.class)
    public ProblemDetail conflicto(ConflictoException ex) {
        return problema(HttpStatus.CONFLICT, "Conflicto con los datos existentes", ex.getMessage());
    }

    @ExceptionHandler(ReglaNegocioException.class)
    public ProblemDetail reglaNegocio(ReglaNegocioException ex) {
        return problema(HttpStatus.UNPROCESSABLE_CONTENT, "Operación no permitida", ex.getMessage());
    }

    @ExceptionHandler(ServicioNoDisponibleException.class)
    public ProblemDetail servicioNoDisponible(ServicioNoDisponibleException ex) {
        ProblemDetail problema = problema(HttpStatus.SERVICE_UNAVAILABLE, "Servicio no disponible", ex.getMessage());
        problema.setProperty("servicio", ex.getServicio());
        return problema;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validacion(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> errores.putIfAbsent(e.getField(), e.getDefaultMessage()));
        ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Datos inválidos",
                "Revisá los campos marcados: hay datos inválidos o incompletos.");
        problema.setProperty("errores", errores);
        return problema;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail cuerpoIlegible(HttpMessageNotReadableException ex) {
        return problema(HttpStatus.BAD_REQUEST, "Solicitud mal formada",
                "El cuerpo de la solicitud no es un JSON válido o tiene valores con formato incorrecto.");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail tipoIncorrecto(MethodArgumentTypeMismatchException ex) {
        return problema(HttpStatus.BAD_REQUEST, "Parámetro inválido",
                "El valor '" + ex.getValue() + "' no es válido para el parámetro '" + ex.getName() + "'.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail integridad(DataIntegrityViolationException ex) {
        log.warn("Violación de integridad de datos", ex);
        return problema(HttpStatus.CONFLICT, "Conflicto con los datos existentes",
                "La operación viola una restricción de la base de datos (por ejemplo, un dato duplicado).");
    }

    /** Se lanza cuando un usuario con sesión intenta algo que su rol no permite. */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ProblemDetail accesoDenegado(org.springframework.security.access.AccessDeniedException ex) {
        return problema(HttpStatus.FORBIDDEN, "Acceso denegado",
                ex.getMessage() != null && !ex.getMessage().isBlank() && !ex.getMessage().equals("Access Denied")
                        ? ex.getMessage() : "No tenés permiso para realizar esta operación.");
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ProblemDetail noAutenticado(org.springframework.security.core.AuthenticationException ex) {
        return problema(HttpStatus.UNAUTHORIZED, "Sesión requerida", ex.getMessage());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail rutaInexistente(NoResourceFoundException ex) {
        return problema(HttpStatus.NOT_FOUND, "Ruta inexistente", "La ruta solicitada no existe.");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail inesperado(Exception ex) {
        log.error("Error inesperado", ex);
        return problema(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno",
                "Ocurrió un error inesperado en el servicio de médicos.");
    }

    private static ProblemDetail problema(HttpStatus estado, String titulo, String detalle) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(estado, detalle);
        problema.setTitle(titulo);
        return problema;
    }
}
