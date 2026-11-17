package com.consultorio.especialidad.dominio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EspecialidadRepository extends JpaRepository<Especialidad, Long> {

    List<Especialidad> findAllByOrderByNombreAsc();

    List<Especialidad> findByActivaTrueOrderByNombreAsc();

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
