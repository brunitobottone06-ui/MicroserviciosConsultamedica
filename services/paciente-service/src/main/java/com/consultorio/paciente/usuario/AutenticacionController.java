package com.consultorio.paciente.usuario;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.consultorio.paciente.seguridad.UsuarioActual;
import com.consultorio.paciente.usuario.DtosUsuario.LoginRequest;
import com.consultorio.paciente.usuario.DtosUsuario.RegistroRequest;
import com.consultorio.paciente.usuario.DtosUsuario.SesionResponse;
import com.consultorio.paciente.usuario.DtosUsuario.UsuarioResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AutenticacionController {

    private final AutenticacionService servicio;

    public AutenticacionController(AutenticacionService servicio) {
        this.servicio = servicio;
    }

    /** Inicio de sesión: devuelve el token que el frontend envía en cada pedido. */
    @PostMapping("/login")
    public SesionResponse iniciarSesion(@Valid @RequestBody LoginRequest pedido) {
        return servicio.iniciarSesion(pedido.usuario(), pedido.clave());
    }

    /** "Crear cuenta" para pacientes nuevos. Inicia sesión automáticamente. */
    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public SesionResponse registrar(@Valid @RequestBody RegistroRequest pedido) {
        return servicio.registrarPaciente(pedido);
    }

    /** Datos del usuario de la sesión actual. */
    @GetMapping("/yo")
    public UsuarioResponse yo() {
        return servicio.obtenerPorNombre(UsuarioActual.obtener().usuario());
    }
}
