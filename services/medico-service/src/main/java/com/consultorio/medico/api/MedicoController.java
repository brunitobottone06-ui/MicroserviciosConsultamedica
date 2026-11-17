package com.consultorio.medico.api;

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

import com.consultorio.medico.servicio.MedicoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/medicos")
public class MedicoController {

    private final MedicoService service;

    public MedicoController(MedicoService service) {
        this.service = service;
    }

    @GetMapping
    public List<MedicoResponse> listar(
            @RequestParam(required = false) Long especialidadId,
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return service.listar(especialidadId, incluirInactivos);
    }

    @GetMapping("/{id}")
    public MedicoResponse obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping
    public ResponseEntity<MedicoResponse> crear(@Valid @RequestBody MedicoRequest request) {
        MedicoResponse creado = service.crear(request);
        return ResponseEntity.created(URI.create("/api/medicos/" + creado.id())).body(creado);
    }

    @PutMapping("/{id}")
    public MedicoResponse actualizar(@PathVariable Long id, @Valid @RequestBody MedicoRequest request) {
        return service.actualizar(id, request);
    }

    /** Baja lógica (no borra el registro). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> darDeBaja(@PathVariable Long id) {
        service.darDeBaja(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    public MedicoResponse reactivar(@PathVariable Long id) {
        return service.reactivar(id);
    }
}
