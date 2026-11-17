package com.consultorio.especialidad.api;

import java.net.URI;
import java.util.List;

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

import com.consultorio.especialidad.servicio.EspecialidadService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/especialidades")
public class EspecialidadController {

    private final EspecialidadService service;

    public EspecialidadController(EspecialidadService service) {
        this.service = service;
    }

    @GetMapping
    public List<EspecialidadResponse> listar(
            @RequestParam(defaultValue = "false") boolean incluirInactivas) {
        return service.listar(incluirInactivas);
    }

    @GetMapping("/{id}")
    public EspecialidadResponse obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    public ResponseEntity<EspecialidadResponse> crear(@Valid @RequestBody EspecialidadRequest request) {
        EspecialidadResponse creada = service.crear(request);
        return ResponseEntity.created(URI.create("/api/especialidades/" + creada.id())).body(creada);
    }

    @PutMapping("/{id}")
    public EspecialidadResponse actualizar(@PathVariable Long id, @Valid @RequestBody EspecialidadRequest request) {
        return service.actualizar(id, request);
    }

    /** Baja lógica (no borra el registro). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> darDeBaja(@PathVariable Long id) {
        service.darDeBaja(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    public EspecialidadResponse reactivar(@PathVariable Long id) {
        return service.reactivar(id);
    }
}
