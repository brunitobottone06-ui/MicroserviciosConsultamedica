package com.consultorio.paciente.servicio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consultorio.paciente.api.PacienteRequest;
import com.consultorio.paciente.dominio.Paciente;
import com.consultorio.paciente.dominio.PacienteRepository;
import com.consultorio.paciente.error.ConflictoException;

@ExtendWith(MockitoExtension.class)
class PacienteServiceTest {

    @Mock
    private PacienteRepository repository;

    @InjectMocks
    private PacienteService service;

    @Test
    void noPermiteDosPacientesConElMismoDni() {
        when(repository.existsByDni("30111222")).thenReturn(true);

        assertThatThrownBy(() -> service.crear(new PacienteRequest("Ana", "Torres", "30111222",
                LocalDate.of(1990, 1, 1), null, null, null)))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("30111222");
        verify(repository, never()).save(any());
    }

    @Test
    void laBajaEsLogica() {
        Paciente paciente = new Paciente("Ana", "Torres", "30111222", LocalDate.of(1990, 1, 1));
        when(repository.findById(1L)).thenReturn(Optional.of(paciente));

        service.darDeBaja(1L);

        assertThat(paciente.isActivo()).isFalse();
        verify(repository, never()).delete(any());
    }

    @Test
    void losCamposOpcionalesVaciosSeGuardanComoNulos() {
        Paciente paciente = new Paciente("Ana", "Torres", "30111222", LocalDate.of(1990, 1, 1));
        when(repository.findById(1L)).thenReturn(Optional.of(paciente));

        service.actualizar(1L, new PacienteRequest(" Ana ", "Torres", "30111222",
                LocalDate.of(1990, 1, 1), "  ", "", "  OSDE "));

        assertThat(paciente.getNombre()).isEqualTo("Ana");
        assertThat(paciente.getEmail()).isNull();
        assertThat(paciente.getTelefono()).isNull();
        assertThat(paciente.getObraSocial()).isEqualTo("OSDE");
    }
}
