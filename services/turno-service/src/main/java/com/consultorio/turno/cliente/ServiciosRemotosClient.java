package com.consultorio.turno.cliente;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.consultorio.turno.cliente.Remotos.EspecialidadRemota;
import com.consultorio.turno.cliente.Remotos.MedicoRemoto;
import com.consultorio.turno.cliente.Remotos.PacienteRemoto;
import com.consultorio.turno.error.ServicioNoDisponibleException;

/**
 * Consultas (solo lectura, GET) a los servicios de Pacientes, Médicos y Especialidades.
 *
 * <p>Como son lecturas, reintentarlas es seguro: no pueden duplicar datos. Se reintenta hasta
 * 2 veces con espera creciente (300 ms y 600 ms) solo cuando el otro servicio no responde.
 * La creación del turno en sí (POST) NUNCA se reintenta automáticamente.</p>
 */
@Component
public class ServiciosRemotosClient {

    private final RestClient pacientes;
    private final RestClient medicos;
    private final RestClient especialidades;

    public ServiciosRemotosClient(@Qualifier("pacienteRestClient") RestClient pacientes,
                                  @Qualifier("medicoRestClient") RestClient medicos,
                                  @Qualifier("especialidadRestClient") RestClient especialidades) {
        this.pacientes = pacientes;
        this.medicos = medicos;
        this.especialidades = especialidades;
    }

    @Retryable(includes = ServicioNoDisponibleException.class, maxRetries = 2, delay = 300, multiplier = 2)
    public Optional<PacienteRemoto> buscarPaciente(Long id) {
        return LlamadaRemota.obtenerPorId(pacientes, "/api/pacientes/{id}", id, PacienteRemoto.class,
                "pacientes", "pacientes");
    }

    @Retryable(includes = ServicioNoDisponibleException.class, maxRetries = 2, delay = 300, multiplier = 2)
    public Optional<MedicoRemoto> buscarMedico(Long id) {
        return LlamadaRemota.obtenerPorId(medicos, "/api/medicos/{id}", id, MedicoRemoto.class,
                "medicos", "médicos");
    }

    @Retryable(includes = ServicioNoDisponibleException.class, maxRetries = 2, delay = 300, multiplier = 2)
    public Optional<EspecialidadRemota> buscarEspecialidad(Long id) {
        return LlamadaRemota.obtenerPorId(especialidades, "/api/especialidades/{id}", id, EspecialidadRemota.class,
                "especialidades", "especialidades");
    }
}
