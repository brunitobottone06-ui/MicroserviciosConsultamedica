package com.consultorio.consulta.dominio;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;

/** Filtros opcionales del listado de consultas. */
public record FiltrosConsulta(Long pacienteId, Long medicoId, Long turnoId) {

    public Specification<Consulta> comoEspecificacion() {
        return (raiz, consulta, cb) -> {
            List<Predicate> condiciones = new ArrayList<>();
            if (pacienteId != null) {
                condiciones.add(cb.equal(raiz.get("pacienteId"), pacienteId));
            }
            if (medicoId != null) {
                condiciones.add(cb.equal(raiz.get("medicoId"), medicoId));
            }
            if (turnoId != null) {
                condiciones.add(cb.equal(raiz.get("turnoId"), turnoId));
            }
            return cb.and(condiciones.toArray(Predicate[]::new));
        };
    }
}
