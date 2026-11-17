package com.consultorio.paciente.usuario;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.consultorio.paciente.seguridad.UsuarioActual;
import com.consultorio.paciente.usuario.DtosUsuario.NuevoUsuarioRequest;
import com.consultorio.paciente.usuario.DtosUsuario.UsuarioResponse;

import jakarta.validation.Valid;

/** Gestión de cuentas (solo personal administrativo, ver SeguridadConfig). */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final AutenticacionService servicio;

    public UsuarioController(AutenticacionService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public List<UsuarioResponse> listar() {
        return servicio.listarUsuarios();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse crear(@Valid @RequestBody NuevoUsuarioRequest pedido) {
        return servicio.crearUsuarioPersonal(pedido);
    }

    @PatchMapping("/{id}/activar")
    public UsuarioResponse activar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, true, UsuarioActual.obtener().usuario());
    }

    @PatchMapping("/{id}/desactivar")
    public UsuarioResponse desactivar(@PathVariable Long id) {
        return servicio.cambiarEstado(id, false, UsuarioActual.obtener().usuario());
    }
}
