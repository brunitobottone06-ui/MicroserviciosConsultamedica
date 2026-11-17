package com.consultorio.especialidad.servicio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consultorio.especialidad.api.EspecialidadRequest;
import com.consultorio.especialidad.dominio.Especialidad;
import com.consultorio.especialidad.dominio.EspecialidadRepository;
import com.consultorio.especialidad.error.ConflictoException;
import com.consultorio.especialidad.error.RecursoNoEncontradoException;

@ExtendWith(MockitoExtension.class)
class EspecialidadServiceTest {

    @Mock
    private EspecialidadRepository repository;

    @InjectMocks
    private EspecialidadService service;

    @Test
    void noPermiteCrearUnaEspecialidadConNombreRepetido() {
        when(repository.existsByNombreIgnoreCase("Cardiología")).thenReturn(true);

        assertThatThrownBy(() -> service.crear(new EspecialidadRequest("  Cardiología ", null)))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("Cardiología");
        verify(repository, never()).save(any());
    }

    @Test
    void laBajaEsLogicaYNoBorraElRegistro() {
        Especialidad especialidad = new Especialidad("Pediatría", null);
        when(repository.findById(2L)).thenReturn(Optional.of(especialidad));

        service.darDeBaja(2L);

        assertThat(especialidad.isActiva()).isFalse();
        verify(repository, never()).delete(any());
    }

    @Test
    void obtenerUnaEspecialidadInexistenteLanzaNoEncontrado() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtener(99L))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("99");
    }
}
