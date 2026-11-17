package com.consultorio.consulta.api;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.consultorio.consulta.dominio.FiltrosConsulta;
import com.consultorio.consulta.servicio.ConsultaService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/consultas")
public class ConsultaController {

    private final ConsultaService service;

    public ConsultaController(ConsultaService service) {
        this.service = service;
    }

    @GetMapping
    public List<ConsultaResponse> listar(
            @RequestParam(required = false) Long pacienteId,
            @RequestParam(required = false) Long medicoId,
            @RequestParam(required = false) Long turnoId) {
        return service.listar(new FiltrosConsulta(pacienteId, medicoId, turnoId));
    }

    @GetMapping("/{id}")
    public ConsultaResponse obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    public ResponseEntity<ConsultaResponse> crear(@Valid @RequestBody ConsultaRequest request) {
        ConsultaResponse creada = service.crear(request);
        return ResponseEntity.created(URI.create("/api/consultas/" + creada.id())).body(creada);
    }

    @PutMapping("/{id}")
    public ConsultaResponse actualizar(@PathVariable Long id,
                                       @Valid @RequestBody ConsultaActualizacionRequest request) {
        return service.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
