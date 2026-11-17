package com.consultorio.consulta.dominio;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Consulta médica: lo que ocurrió en la atención de un turno (motivo, diagnóstico, tratamiento).
 * Es información clínica sensible. Cada turno puede tener como máximo una consulta.
 *
 * <p>pacienteId, medicoId y especialidadId se copian del turno al registrar la consulta, para poder
 * filtrar el historial sin tener que preguntarle al servicio de Turnos cada vez.</p>
 */
@Entity
@Table(name = "consulta")
public class Consulta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "turno_id", nullable = false)
    private Long turnoId;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    @Column(name = "medico_id", nullable = false)
    private Long medicoId;

    @Column(name = "especialidad_id", nullable = false)
    private Long especialidadId;

    @Column(name = "fecha_turno", nullable = false)
    private LocalDateTime fechaTurno;

    @Column(name = "registrada_en", nullable = false)
    private LocalDateTime registradaEn;

    @Column(nullable = false, length = 500)
    private String motivo;

    @Column(length = 2000)
    private String diagnostico;

    @Column(length = 2000)
    private String tratamiento;

    @Column(length = 2000)
    private String observaciones;

    @Version
    private long version;

    protected Consulta() {
        // requerido por JPA
    }

    public Consulta(Long turnoId, Long pacienteId, Long medicoId, Long especialidadId,
                    LocalDateTime fechaTurno, LocalDateTime registradaEn) {
        this.turnoId = turnoId;
        this.pacienteId = pacienteId;
        this.medicoId = medicoId;
        this.especialidadId = especialidadId;
        this.fechaTurno = fechaTurno;
        this.registradaEn = registradaEn;
    }

    public Long getId() {
        return id;
    }

    public Long getTurnoId() {
        return turnoId;
    }

    public Long getPacienteId() {
        return pacienteId;
    }

    public Long getMedicoId() {
        return medicoId;
    }

    public Long getEspecialidadId() {
        return especialidadId;
    }

    public LocalDateTime getFechaTurno() {
        return fechaTurno;
    }

    public LocalDateTime getRegistradaEn() {
        return registradaEn;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public String getDiagnostico() {
        return diagnostico;
    }

    public void setDiagnostico(String diagnostico) {
        this.diagnostico = diagnostico;
    }

    public String getTratamiento() {
        return tratamiento;
    }

    public void setTratamiento(String tratamiento) {
        this.tratamiento = tratamiento;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}
