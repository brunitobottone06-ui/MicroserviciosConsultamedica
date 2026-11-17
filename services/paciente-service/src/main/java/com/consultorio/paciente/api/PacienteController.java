package com.consultorio.paciente.api;

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

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.consultorio.paciente.seguridad.UsuarioActual;
import com.consultorio.paciente.servicio.PacienteService;
import com.consultorio.paciente.usuario.AutenticacionService;
import com.consultorio.paciente.usuario.DtosUsuario.AccesoPacienteRequest;
import com.consultorio.paciente.usuario.DtosUsuario.UsuarioResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/pacientes")
public class PacienteController {

    private final PacienteService service;
    private final AutenticacionService autenticacion;

    public PacienteController(PacienteService service, AutenticacionService autenticacion) {
        this.service = service;
        this.autenticacion = autenticacion;
    }

    @GetMapping
    public List<PacienteResponse> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return service.listar(buscar, incluirInactivos);
    }

    @GetMapping("/{id}")
    public PacienteResponse obtener(@PathVariable Long id) {
        UsuarioActual actual = UsuarioActual.obtener();
        if (actual.esPaciente() && !id.equals(actual.pacienteId())) {
            throw new AccessDeniedException("Solo podés ver tus propios datos.");
        }
        return service.obtener(id);
    }

    /** Recepción habilita el acceso web de un paciente ya cargado (su usuario será su DNI). */
    @PostMapping("/{id}/acceso")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse habilitarAcceso(@PathVariable Long id, @Valid @RequestBody AccesoPacienteRequest pedido) {
        return autenticacion.habilitarAccesoPaciente(id, pedido.clave());
    }

    @PostMapping
    public ResponseEntity<PacienteResponse> crear(@Valid @RequestBody PacienteRequest request) {
        PacienteResponse creado = service.crear(request);
        return ResponseEntity.created(URI.create("/api/pacientes/" + creado.id())).body(creado);
    }

    @PutMapping("/{id}")
    public PacienteResponse actualizar(@PathVariable Long id, @Valid @RequestBody PacienteRequest request) {
        return service.actualizar(id, request);
    }

    /** Baja lógica (no borra el registro). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> darDeBaja(@PathVariable Long id) {
        service.darDeBaja(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    public PacienteResponse reactivar(@PathVariable Long id) {
        return service.reactivar(id);
    }
}
