package com.consultorio.consulta.servicio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consultorio.consulta.api.ConsultaRequest;
import com.consultorio.consulta.cliente.TurnoClient;
import com.consultorio.consulta.cliente.TurnoRemoto;
import com.consultorio.consulta.dominio.Consulta;
import com.consultorio.consulta.dominio.ConsultaRepository;
import com.consultorio.consulta.error.ConflictoException;
import com.consultorio.consulta.error.ReglaNegocioException;
import com.consultorio.consulta.error.ServicioNoDisponibleException;

@ExtendWith(MockitoExtension.class)
class ConsultaServiceTest {

    private static final LocalDateTime FECHA_TURNO = LocalDateTime.of(2030, 3, 5, 10, 0);

    @Mock
    private ConsultaRepository repository;
    @Mock
    private TurnoClient turnoClient;

    private ConsultaService service;

    @BeforeEach
    void preparar() {
        Clock reloj = Clock.fixed(Instant.parse("2030-03-05T13:30:00Z"), ZoneId.of("America/Argentina/Buenos_Aires"));
        service = new ConsultaService(repository, turnoClient, reloj);
    }

    private static TurnoRemoto turno(String estado) {
        return new TurnoRemoto(10L, 7L, 1L, 3L, FECHA_TURNO, estado);
    }

    private static ConsultaRequest pedido() {
        return new ConsultaRequest(10L, " Control anual ", "Sin hallazgos", null, "  ");
    }

    @Test
    void registraLaConsultaCopiandoLosDatosDelTurnoYLoMarcaAtendido() {
        when(turnoClient.obtener(10L)).thenReturn(Optional.of(turno("PROGRAMADO")));

        var consulta = service.crear(pedido());

        assertThat(consulta.pacienteId()).isEqualTo(7L);
        assertThat(consulta.medicoId()).isEqualTo(1L);
        assertThat(consulta.fechaTurno()).isEqualTo(FECHA_TURNO);
        assertThat(consulta.registradaEn()).isEqualTo(LocalDateTime.of(2030, 3, 5, 10, 30));
        assertThat(consulta.motivo()).isEqualTo("Control anual");
        assertThat(consulta.observaciones()).isNull();
        verify(repository).saveAndFlush(any(Consulta.class));
        verify(turnoClient).marcarAtendido(10L);
    }

    @Test
    void permiteRegistrarUnTurnoAtendidoSinConsultaSinVolverAMarcarlo() {
        when(turnoClient.obtener(10L)).thenReturn(Optional.of(turno("ATENDIDO")));

        service.crear(pedido());

        verify(turnoClient, never()).marcarAtendido(anyLong());
    }

    @Test
    void rechazaTurnosCanceladosOInexistentes() {
        when(turnoClient.obtener(10L)).thenReturn(Optional.of(turno("CANCELADO")));
        assertThatThrownBy(() -> service.crear(pedido()))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("cancelado");

        when(turnoClient.obtener(10L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.crear(pedido()))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessage("El turno seleccionado no existe");
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void unTurnoNoPuedeTenerDosConsultas() {
        when(repository.existsByTurnoId(10L)).thenReturn(true);

        assertThatThrownBy(() -> service.crear(pedido())).isInstanceOf(ConflictoException.class);
        verify(turnoClient, never()).obtener(anyLong());
    }

    @Test
    void siTurnosNoRespondeAlMarcarAtendidoPropagaElErrorParaDeshacerLaTransaccion() {
        when(turnoClient.obtener(10L)).thenReturn(Optional.of(turno("PROGRAMADO")));
        org.mockito.Mockito.doThrow(new ServicioNoDisponibleException("turnos", "no disponible"))
                .when(turnoClient).marcarAtendido(10L);

        assertThatThrownBy(() -> service.crear(pedido())).isInstanceOf(ServicioNoDisponibleException.class);
    }
}
