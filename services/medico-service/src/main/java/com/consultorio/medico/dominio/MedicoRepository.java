package com.consultorio.medico.dominio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MedicoRepository extends JpaRepository<Medico, Long> {

    List<Medico> findAllByOrderByApellidoAscNombreAsc();

    List<Medico> findByActivoTrueOrderByApellidoAscNombreAsc();

    @Query("""
            select distinct m from Medico m join m.especialidadIds e
            where e = :especialidadId and (:incluirInactivos = true or m.activo = true)
            order by m.apellido, m.nombre
            """)
    List<Medico> buscarPorEspecialidad(@Param("especialidadId") Long especialidadId,
                                       @Param("incluirInactivos") boolean incluirInactivos);

    boolean existsByMatriculaIgnoreCase(String matricula);

    boolean existsByMatriculaIgnoreCaseAndIdNot(String matricula, Long id);
}
