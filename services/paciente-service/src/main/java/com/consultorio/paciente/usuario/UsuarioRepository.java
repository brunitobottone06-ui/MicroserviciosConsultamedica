package com.consultorio.paciente.usuario;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsuarioIgnoreCase(String usuario);

    boolean existsByUsuarioIgnoreCase(String usuario);

    boolean existsByPacienteId(Long pacienteId);

    boolean existsByRol(Rol rol);

    List<Usuario> findAllByOrderByRolAscUsuarioAsc();
}
