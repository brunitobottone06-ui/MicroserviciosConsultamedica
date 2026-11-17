package com.consultorio.turno.dominio;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;

/** Filtros opcionales del listado de turnos, traducidos a una consulta JPA (Criteria API). */
public record FiltrosTurno(Long pacienteId, Long medicoId, Long especialidadId, EstadoTurno estado,
                           LocalDate desde, LocalDate hasta) {

    public Specification<Turno> comoEspecificacion() {
        return (raiz, consulta, cb) -> {
            List<Predicate> condiciones = new ArrayList<>();
            if (pacienteId != null) {
                condiciones.add(cb.equal(raiz.get("pacienteId"), pacienteId));
            }
            if (medicoId != null) {
                condiciones.add(cb.equal(raiz.get("medicoId"), medicoId));
            }
            if (especialidadId != null) {
                condiciones.add(cb.equal(raiz.get("especialidadId"), especialidadId));
            }
            if (estado != null) {
                condiciones.add(cb.equal(raiz.get("estado"), estado));
            }
            if (desde != null) {
                condiciones.add(cb.greaterThanOrEqualTo(raiz.get("fechaHora"), desde.atStartOfDay()));
            }
            if (hasta != null) {
                condiciones.add(cb.lessThan(raiz.get("fechaHora"), hasta.plusDays(1).atStartOfDay()));
            }
            return cb.and(condiciones.toArray(Predicate[]::new));
        };
    }
}
