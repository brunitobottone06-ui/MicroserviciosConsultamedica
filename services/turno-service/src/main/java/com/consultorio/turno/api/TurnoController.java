package com.consultorio.turno.api;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.consultorio.turno.config.HorarioConsultorio;
import com.consultorio.turno.dominio.EstadoTurno;
import com.consultorio.turno.dominio.FiltrosTurno;
import com.consultorio.turno.servicio.TurnoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/turnos")
public class TurnoController {

    private final TurnoService service;
    private final HorarioConsultorio horario;

    public TurnoController(TurnoService service, HorarioConsultorio horario) {
        this.service = service;
        this.horario = horario;
    }

    @GetMapping
    public List<TurnoResponse> listar(
            @RequestParam(required = false) Long pacienteId,
            @RequestParam(required = false) Long medicoId,
            @RequestParam(required = false) Long especialidadId,
            @RequestParam(required = false) EstadoTurno estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return service.listar(new FiltrosTurno(pacienteId, medicoId, especialidadId, estado, desde, hasta));
    }

    @GetMapping("/horario")
    public HorarioResponse horario() {
        return HorarioResponse.desde(horario);
    }

    @GetMapping("/{id}")
    public TurnoResponse obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    public ResponseEntity<TurnoResponse> crear(@Valid @RequestBody TurnoRequest request) {
        TurnoResponse creado = service.crear(request);
        return ResponseEntity.created(URI.create("/api/turnos/" + creado.id())).body(creado);
    }

    @PutMapping("/{id}")
    public TurnoResponse actualizar(@PathVariable Long id, @Valid @RequestBody TurnoRequest request) {
        return service.actualizar(id, request);
    }

    @PatchMapping("/{id}/cancelar")
    public TurnoResponse cancelar(@PathVariable Long id) {
        return service.cancelar(id);
    }

    /** Usado por el servicio de Consultas al registrar la consulta de este turno. */
    @PatchMapping("/{id}/atender")
    public TurnoResponse atender(@PathVariable Long id) {
        return service.marcarAtendido(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
