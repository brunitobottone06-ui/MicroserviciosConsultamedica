package com.consultorio.consulta.asistente;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consultorio.consulta.asistente.DtosAsistente.Estado;
import com.consultorio.consulta.asistente.DtosAsistente.Pregunta;
import com.consultorio.consulta.asistente.DtosAsistente.Respuesta;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/asistente")
public class AsistenteController {

    private final AsistenteService asistente;
    private final EstadoOllama estadoOllama;

    public AsistenteController(AsistenteService asistente, EstadoOllama estadoOllama) {
        this.asistente = asistente;
        this.estadoOllama = estadoOllama;
    }

    /** ¿Está disponible el asistente? Si no, explica el motivo (el frontend lo muestra). */
    @GetMapping("/estado")
    public Estado estado() {
        return estadoOllama.consultar();
    }

    @PostMapping("/chat")
    public Respuesta chat(@Valid @RequestBody Pregunta pregunta) {
        return asistente.responder(pregunta);
    }
}
