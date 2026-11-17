package com.consultorio.consulta.dominio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ConsultaRepository extends JpaRepository<Consulta, Long>, JpaSpecificationExecutor<Consulta> {

    boolean existsByTurnoId(Long turnoId);
}
