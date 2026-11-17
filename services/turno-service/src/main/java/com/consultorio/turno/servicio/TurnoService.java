package com.consultorio.turno.servicio;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consultorio.turno.api.TurnoRequest;
import com.consultorio.turno.api.TurnoResponse;
import com.consultorio.turno.cliente.Remotos.EspecialidadRemota;
import com.consultorio.turno.cliente.Remotos.MedicoRemoto;
import com.consultorio.turno.cliente.Remotos.PacienteRemoto;
import com.consultorio.turno.cliente.ServiciosRemotosClient;
import com.consultorio.turno.config.HorarioConsultorio;
import com.consultorio.turno.dominio.EstadoTurno;
import com.consultorio.turno.dominio.FiltrosTurno;
import com.consultorio.turno.dominio.Turno;
import com.consultorio.turno.dominio.TurnoRepository;
import com.consultorio.turno.error.ConflictoException;
import com.consultorio.turno.error.RecursoNoEncontradoException;
import com.consultorio.turno.error.ReglaNegocioException;
import com.consultorio.turno.seguridad.UsuarioActual;

@Service
@Transactional
public class TurnoService {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final long SIN_EXCLUIR = -1L;

    private final TurnoRepository repository;
    private final ServiciosRemotosClient remotos;
    private final HorarioConsultorio horario;
    private final Clock reloj;

    public TurnoService(TurnoRepository repository, ServiciosRemotosClient remotos,
                        HorarioConsultorio horario, Clock reloj) {
        this.repository = repository;
        this.remotos = remotos;
        this.horario = horario;
        this.reloj = reloj;
    }

    /** Un paciente solo ve sus turnos: se ignora cualquier filtro de paciente que envíe y se fuerza el suyo. */
    @Transactional(readOnly = true)
    public List<TurnoResponse> listar(FiltrosTurno filtros) {
        UsuarioActual actual = UsuarioActual.obtener();
        FiltrosTurno efectivos = actual.esPaciente()
                ? new FiltrosTurno(actual.pacienteId(), filtros.medicoId(), filtros.especialidadId(), filtros.estado(),
                        filtros.desde(), filtros.hasta())
                : filtros;
        return repository.findAll(efectivos.comoEspecificacion(), Sort.by("fechaHora", "id"))
                .stream().map(TurnoResponse::desde).toList();
    }

    @Transactional(readOnly = true)
    public TurnoResponse obtener(Long id) {
        Turno turno = buscar(id);
        exigirQueSeaPropio(turno.getPacienteId(), "Solo podés ver tus propios turnos.");
        return TurnoResponse.desde(turno);
    }

    /**
     * Crea un turno. Orden de validación: primero lo local (fecha, horario), luego los otros
     * servicios (paciente, médico, especialidad) y por último la disponibilidad en esta base.
     */
    public TurnoResponse crear(TurnoRequest request) {
        exigirQueSeaPropio(request.pacienteId(), "Solo podés pedir turnos para vos.");
        LocalDateTime inicio = request.fechaHora().truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime fin = inicio.plusMinutes(request.duracionEfectiva());

        validarFechaYHorario(inicio, fin);
        validarReferencias(request);
        validarDisponibilidad(request.pacienteId(), request.medicoId(), inicio, fin, SIN_EXCLUIR);

        Turno turno = new Turno(request.pacienteId(), request.medicoId(), request.especialidadId(), inicio,
                request.duracionEfectiva(), limpiar(request.motivo()), LocalDateTime.now(reloj));
        return TurnoResponse.desde(repository.save(turno));
    }

    /** Reprograma o corrige un turno. Solo se permite mientras está PROGRAMADO. */
    public TurnoResponse actualizar(Long id, TurnoRequest request) {
        Turno turno = buscar(id);
        exigirEstado(turno, EstadoTurno.PROGRAMADO, "Solo se pueden modificar turnos programados");

        LocalDateTime inicio = request.fechaHora().truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime fin = inicio.plusMinutes(request.duracionEfectiva());
        validarFechaYHorario(inicio, fin);
        validarReferencias(request);
        validarDisponibilidad(request.pacienteId(), request.medicoId(), inicio, fin, id);

        turno.setPacienteId(request.pacienteId());
        turno.setMedicoId(request.medicoId());
        turno.setEspecialidadId(request.especialidadId());
        turno.reprogramar(inicio, request.duracionEfectiva());
        turno.setMotivo(limpiar(request.motivo()));
        return TurnoResponse.desde(turno);
    }

    /** Idempotente: cancelar un turno ya cancelado no es un error. */
    public TurnoResponse cancelar(Long id) {
        Turno turno = buscar(id);
        exigirQueSeaPropio(turno.getPacienteId(), "Solo podés cancelar tus propios turnos.");
        if (turno.getEstado() == EstadoTurno.ATENDIDO) {
            throw new ConflictoException("No se puede cancelar un turno que ya fue atendido");
        }
        turno.setEstado(EstadoTurno.CANCELADO);
        return TurnoResponse.desde(turno);
    }

    /**
     * Lo invoca el servicio de Consultas al registrar la consulta del turno.
     * Es idempotente (marcar dos veces da el mismo resultado), por eso el llamador puede reintentarlo.
     */
    public TurnoResponse marcarAtendido(Long id) {
        Turno turno = buscar(id);
        if (turno.getEstado() == EstadoTurno.CANCELADO) {
            throw new ConflictoException("No se puede atender un turno cancelado");
        }
        turno.setEstado(EstadoTurno.ATENDIDO);
        return TurnoResponse.desde(turno);
    }

    /** Solo se borran físicamente turnos cancelados: un turno atendido tiene una consulta asociada. */
    public void eliminar(Long id) {
        Turno turno = buscar(id);
        exigirEstado(turno, EstadoTurno.CANCELADO,
                "Solo se pueden eliminar turnos cancelados. Cancelá el turno primero");
        repository.delete(turno);
    }

    private void validarFechaYHorario(LocalDateTime inicio, LocalDateTime fin) {
        if (!inicio.isAfter(LocalDateTime.now(reloj))) {
            throw new ReglaNegocioException("El turno debe ser en una fecha y hora futura");
        }
        if (!horario.permite(inicio, fin)) {
            throw new ReglaNegocioException("El turno está fuera del horario de atención del consultorio ("
                    + horario.descripcion() + ")");
        }
    }

    private void validarReferencias(TurnoRequest request) {
        EspecialidadRemota especialidad = remotos.buscarEspecialidad(request.especialidadId())
                .orElseThrow(() -> new ReglaNegocioException("La especialidad seleccionada no existe"));
        if (!especialidad.activa()) {
            throw new ReglaNegocioException("La especialidad '" + especialidad.nombre() + "' está dada de baja");
        }

        MedicoRemoto medico = remotos.buscarMedico(request.medicoId())
                .orElseThrow(() -> new ReglaNegocioException("El médico seleccionado no existe"));
        if (!medico.activo()) {
            throw new ReglaNegocioException("El médico " + medico.nombreCompleto() + " está dado de baja");
        }
        if (!medico.atiende(especialidad.id())) {
            throw new ReglaNegocioException("El médico " + medico.nombreCompleto()
                    + " no atiende la especialidad '" + especialidad.nombre() + "'");
        }

        PacienteRemoto paciente = remotos.buscarPaciente(request.pacienteId())
                .orElseThrow(() -> new ReglaNegocioException("El paciente seleccionado no existe"));
        if (!paciente.activo()) {
            throw new ReglaNegocioException("El paciente " + paciente.nombreCompleto() + " está dado de baja");
        }
    }

    private void validarDisponibilidad(Long pacienteId, Long medicoId, LocalDateTime inicio, LocalDateTime fin,
                                       Long excluirId) {
        repository.superpuestosDelMedico(medicoId, inicio, fin, excluirId).stream().findFirst()
                .ifPresent(t -> {
                    throw new ConflictoException("El médico ya tiene un turno programado de "
                            + t.getFechaHora().format(HORA) + " a " + t.getFechaHoraFin().format(HORA)
                            + " que se superpone con el horario elegido");
                });
        repository.superpuestosDelPaciente(pacienteId, inicio, fin, excluirId).stream().findFirst()
                .ifPresent(t -> {
                    throw new ConflictoException("El paciente ya tiene otro turno programado de "
                            + t.getFechaHora().format(HORA) + " a " + t.getFechaHoraFin().format(HORA)
                            + " que se superpone con el horario elegido");
                });
    }

    /** Si quien pide es un PACIENTE, el turno debe ser suyo. El personal puede operar sobre cualquier turno. */
    private static void exigirQueSeaPropio(Long pacienteDelTurno, String mensaje) {
        UsuarioActual actual = UsuarioActual.obtener();
        if (actual.esPaciente() && !java.util.Objects.equals(pacienteDelTurno, actual.pacienteId())) {
            throw new AccessDeniedException(mensaje);
        }
    }

    private static void exigirEstado(Turno turno, EstadoTurno esperado, String mensaje) {
        if (turno.getEstado() != esperado) {
            throw new ConflictoException(mensaje + " (estado actual: " + turno.getEstado().name().toLowerCase() + ")");
        }
    }

    private Turno buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el turno con ID " + id));
    }

    private static String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
