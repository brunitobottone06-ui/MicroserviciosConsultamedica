package com.consultorio.turno.dominio;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TurnoRepository extends JpaRepository<Turno, Long>, JpaSpecificationExecutor<Turno> {

    /**
     * Turnos PROGRAMADOS del médico que se superponen con el intervalo [inicio, fin).
     * Dos intervalos se superponen si cada uno empieza antes de que termine el otro.
     * {@code excluirId} permite ignorar el propio turno al reprogramarlo (usar -1 al crear).
     */
    @Query("""
            select t from Turno t
            where t.medicoId = :medicoId and t.estado = com.consultorio.turno.dominio.EstadoTurno.PROGRAMADO
              and t.id <> :excluirId and t.fechaHora < :fin and t.fechaHoraFin > :inicio
            """)
    List<Turno> superpuestosDelMedico(@Param("medicoId") Long medicoId, @Param("inicio") LocalDateTime inicio,
                                      @Param("fin") LocalDateTime fin, @Param("excluirId") Long excluirId);

    @Query("""
            select t from Turno t
            where t.pacienteId = :pacienteId and t.estado = com.consultorio.turno.dominio.EstadoTurno.PROGRAMADO
              and t.id <> :excluirId and t.fechaHora < :fin and t.fechaHoraFin > :inicio
            """)
    List<Turno> superpuestosDelPaciente(@Param("pacienteId") Long pacienteId, @Param("inicio") LocalDateTime inicio,
                                        @Param("fin") LocalDateTime fin, @Param("excluirId") Long excluirId);
}
