package com.consultorio.consulta.servicio;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consultorio.consulta.api.ConsultaActualizacionRequest;
import com.consultorio.consulta.api.ConsultaRequest;
import com.consultorio.consulta.api.ConsultaResponse;
import com.consultorio.consulta.cliente.TurnoClient;
import com.consultorio.consulta.cliente.TurnoRemoto;
import com.consultorio.consulta.dominio.Consulta;
import com.consultorio.consulta.dominio.ConsultaRepository;
import com.consultorio.consulta.dominio.FiltrosConsulta;
import com.consultorio.consulta.error.ConflictoException;
import com.consultorio.consulta.error.RecursoNoEncontradoException;
import com.consultorio.consulta.error.ReglaNegocioException;

@Service
@Transactional
public class ConsultaService {

    private final ConsultaRepository repository;
    private final TurnoClient turnoClient;
    private final Clock reloj;

    public ConsultaService(ConsultaRepository repository, TurnoClient turnoClient, Clock reloj) {
        this.repository = repository;
        this.turnoClient = turnoClient;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public List<ConsultaResponse> listar(FiltrosConsulta filtros) {
        return repository.findAll(filtros.comoEspecificacion(), Sort.by(Sort.Direction.DESC, "fechaTurno", "id"))
                .stream().map(ConsultaResponse::desde).toList();
    }

    @Transactional(readOnly = true)
    public ConsultaResponse obtener(Long id) {
        return ConsultaResponse.desde(buscar(id));
    }

    /**
     * Registra la consulta de un turno y marca el turno como ATENDIDO en el servicio de Turnos.
     *
     * <p>Coordinación entre servicios: primero se guarda la consulta (sin confirmar la transacción),
     * luego se avisa a Turnos. Si Turnos falla, se lanza una excepción y la transacción local se
     * deshace, así no queda una consulta "huérfana". El aviso a Turnos es idempotente, por eso
     * también se acepta registrar la consulta de un turno que ya figura ATENDIDO sin consulta
     * (por ejemplo, si una ejecución anterior falló justo después de avisar a Turnos).</p>
     */
    public ConsultaResponse crear(ConsultaRequest request) {
        if (repository.existsByTurnoId(request.turnoId())) {
            throw new ConflictoException("Ese turno ya tiene una consulta registrada");
        }
        TurnoRemoto turno = turnoClient.obtener(request.turnoId())
                .orElseThrow(() -> new ReglaNegocioException("El turno seleccionado no existe"));
        if (turno.estaCancelado()) {
            throw new ReglaNegocioException("No se puede registrar una consulta para un turno cancelado");
        }

        Consulta consulta = new Consulta(turno.id(), turno.pacienteId(), turno.medicoId(), turno.especialidadId(),
                turno.fechaHora(), LocalDateTime.now(reloj));
        copiarDatosClinicos(consulta, request.motivo(), request.diagnostico(), request.tratamiento(),
                request.observaciones());
        repository.saveAndFlush(consulta);

        if (turno.estaProgramado()) {
            turnoClient.marcarAtendido(turno.id());
        }
        return ConsultaResponse.desde(consulta);
    }

    public ConsultaResponse actualizar(Long id, ConsultaActualizacionRequest request) {
        Consulta consulta = buscar(id);
        copiarDatosClinicos(consulta, request.motivo(), request.diagnostico(), request.tratamiento(),
                request.observaciones());
        return ConsultaResponse.desde(consulta);
    }

    /**
     * Elimina la consulta (por ejemplo, si se cargó en el turno equivocado). El turno queda ATENDIDO
     * y se le puede volver a registrar una consulta.
     */
    public void eliminar(Long id) {
        repository.delete(buscar(id));
    }

    private static void copiarDatosClinicos(Consulta consulta, String motivo, String diagnostico,
                                            String tratamiento, String observaciones) {
        consulta.setMotivo(motivo.trim());
        consulta.setDiagnostico(limpiar(diagnostico));
        consulta.setTratamiento(limpiar(tratamiento));
        consulta.setObservaciones(limpiar(observaciones));
    }

    private Consulta buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la consulta con ID " + id));
    }

    private static String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
