package com.consultorio.paciente.dominio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PacienteRepository extends JpaRepository<Paciente, Long> {

    /**
     * Busca por nombre, apellido o DNI (texto parcial, sin distinguir mayúsculas).
     * Si {@code texto} es vacío devuelve todos.
     */
    @Query("""
            select p from Paciente p
            where (:incluirInactivos = true or p.activo = true)
              and (:texto = ''
                   or lower(p.nombre) like lower(concat('%', :texto, '%'))
                   or lower(p.apellido) like lower(concat('%', :texto, '%'))
                   or p.dni like concat('%', :texto, '%'))
            order by p.apellido, p.nombre
            """)
    List<Paciente> buscar(@Param("texto") String texto, @Param("incluirInactivos") boolean incluirInactivos);

    boolean existsByDni(String dni);

    boolean existsByDniAndIdNot(String dni, Long id);
}
