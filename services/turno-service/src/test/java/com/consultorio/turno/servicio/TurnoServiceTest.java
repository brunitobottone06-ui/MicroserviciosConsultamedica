package com.consultorio.turno.servicio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consultorio.turno.api.TurnoRequest;
import com.consultorio.turno.cliente.Remotos.EspecialidadRemota;
import com.consultorio.turno.cliente.Remotos.MedicoRemoto;
import com.consultorio.turno.cliente.Remotos.PacienteRemoto;
import com.consultorio.turno.cliente.ServiciosRemotosClient;
import com.consultorio.turno.config.ConsultorioProperties;
import com.consultorio.turno.config.HorarioConsultorio;
import com.consultorio.turno.dominio.EstadoTurno;
import com.consultorio.turno.dominio.Turno;
import com.consultorio.turno.dominio.TurnoRepository;
import com.consultorio.turno.error.ConflictoException;
import com.consultorio.turno.error.ReglaNegocioException;
import com.consultorio.turno.error.ServicioNoDisponibleException;

@ExtendWith(MockitoExtension.class)
class TurnoServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    /** "Ahora" fijo para las pruebas: lunes 4/3/2030 a las 09:00. */
    private static final LocalDateTime AHORA = LocalDateTime.of(2030, 3, 4, 9, 0);
    private static final LocalDateTime MARTES_10 = LocalDateTime.of(2030, 3, 5, 10, 0);

    @Mock
    private TurnoRepository repository;
    @Mock
    private ServiciosRemotosClient remotos;

    private TurnoService service;

    @BeforeEach
    void preparar() {
        Clock reloj = Clock.fixed(AHORA.atZone(ZONA).toInstant(), ZONA);
        HorarioConsultorio horario = HorarioConsultorio.desde(new ConsultorioProperties(
                ZONA.getId(), "08:00", "20:00", List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")));
        service = new TurnoService(repository, remotos, horario, reloj);

        lenient().when(remotos.buscarEspecialidad(3L)).thenReturn(Optional.of(new EspecialidadRemota(3L, "Cardiología", true)));
        lenient().when(remotos.buscarMedico(1L)).thenReturn(Optional.of(
                new MedicoRemoto(1L, "Laura", "Gómez", true, List.of(1L, 3L))));
        lenient().when(remotos.buscarPaciente(7L)).thenReturn(Optional.of(new PacienteRemoto(7L, "Ana", "Torres", true)));
        lenient().when(repository.save(any(Turno.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static TurnoRequest pedido(LocalDateTime fechaHora) {
        return new TurnoRequest(7L, 1L, 3L, fechaHora, 30, "Control");
    }

    @Test
    void creaUnTurnoValido() {
        var turno = service.crear(pedido(MARTES_10));

        assertThat(turno.estado()).isEqualTo(EstadoTurno.PROGRAMADO);
        assertThat(turno.fechaHoraFin()).isEqualTo(MARTES_10.plusMinutes(30));
        assertThat(turno.creadoEn()).isEqualTo(AHORA);
    }

    @Test
    void rechazaTurnosEnElPasadoSinConsultarOtrosServicios() {
        assertThatThrownBy(() -> service.crear(pedido(AHORA.minusHours(1))))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessage("El turno debe ser en una fecha y hora futura");
        verifyNoInteractions(remotos);
    }

    @Test
    void rechazaTurnosFueraDeHorario() {
        assertThatThrownBy(() -> service.crear(pedido(LocalDateTime.of(2030, 3, 5, 19, 45))))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("fuera del horario");
    }

    @Test
    void rechazaSiElMedicoNoAtiendeEsaEspecialidad() {
        when(remotos.buscarEspecialidad(2L)).thenReturn(Optional.of(new EspecialidadRemota(2L, "Pediatría", true)));

        assertThatThrownBy(() -> service.crear(new TurnoRequest(7L, 1L, 2L, MARTES_10, 30, null)))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessage("El médico Laura Gómez no atiende la especialidad 'Pediatría'");
    }

    @Test
    void rechazaPacientesDadosDeBaja() {
        when(remotos.buscarPaciente(7L)).thenReturn(Optional.of(new PacienteRemoto(7L, "Ana", "Torres", false)));

        assertThatThrownBy(() -> service.crear(pedido(MARTES_10)))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("dado de baja");
    }

    @Test
    void rechazaSiElMedicoYaTieneUnTurnoSuperpuesto() {
        Turno existente = new Turno(9L, 1L, 3L, MARTES_10.minusMinutes(15), 30, null, AHORA);
        when(repository.superpuestosDelMedico(eq(1L), any(), any(), anyLong())).thenReturn(List.of(existente));

        assertThatThrownBy(() -> service.crear(pedido(MARTES_10)))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("El médico ya tiene un turno programado de 09:45 a 10:15");
        verify(repository, never()).save(any());
    }

    @Test
    void siUnServicioNoRespondeNoSeCreaElTurno() {
        when(remotos.buscarPaciente(7L)).thenThrow(new ServicioNoDisponibleException("pacientes", "no disponible"));

        assertThatThrownBy(() -> service.crear(pedido(MARTES_10)))
                .isInstanceOf(ServicioNoDisponibleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void marcarAtendidoEsIdempotente() {
        Turno turno = new Turno(7L, 1L, 3L, MARTES_10, 30, null, AHORA);
        when(repository.findById(5L)).thenReturn(Optional.of(turno));

        service.marcarAtendido(5L);
        service.marcarAtendido(5L);

        assertThat(turno.getEstado()).isEqualTo(EstadoTurno.ATENDIDO);
    }

    @Test
    void noSePuedeCancelarUnTurnoAtendidoNiEliminarUnoProgramado() {
        Turno atendido = new Turno(7L, 1L, 3L, MARTES_10, 30, null, AHORA);
        atendido.setEstado(EstadoTurno.ATENDIDO);
        Turno programado = new Turno(7L, 1L, 3L, MARTES_10, 30, null, AHORA);
        when(repository.findById(1L)).thenReturn(Optional.of(atendido));
        when(repository.findById(2L)).thenReturn(Optional.of(programado));

        assertThatThrownBy(() -> service.cancelar(1L)).isInstanceOf(ConflictoException.class);
        assertThatThrownBy(() -> service.eliminar(2L))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("Cancelá el turno primero");
        verify(repository, never()).delete(any(Turno.class));
    }
}
