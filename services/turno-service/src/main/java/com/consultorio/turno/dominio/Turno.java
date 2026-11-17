package com.consultorio.turno.dominio;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Turno: une a un paciente, un médico y una especialidad en una fecha y hora.
 * Paciente, médico y especialidad pertenecen a OTROS microservicios; aquí solo se guardan
 * sus IDs (referencias lógicas). Su existencia se valida por API REST al crear/editar.
 */
@Entity
@Table(name = "turno")
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "paciente_id", nullable = false)
    private Long pacienteId;

    @Column(name = "medico_id", nullable = false)
    private Long medicoId;

    @Column(name = "especialidad_id", nullable = false)
    private Long especialidadId;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    /** Se guarda calculado (inicio + duración) para poder buscar superposiciones con una consulta simple. */
    @Column(name = "fecha_hora_fin", nullable = false)
    private LocalDateTime fechaHoraFin;

    @Column(name = "duracion_minutos", nullable = false)
    private int duracionMinutos;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoTurno estado = EstadoTurno.PROGRAMADO;

    @Column(length = 255)
    private String motivo;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    /** Bloqueo optimista: evita que dos ediciones simultáneas se pisen. */
    @Version
    private long version;

    protected Turno() {
        // requerido por JPA
    }

    public Turno(Long pacienteId, Long medicoId, Long especialidadId, LocalDateTime fechaHora,
                 int duracionMinutos, String motivo, LocalDateTime creadoEn) {
        this.pacienteId = pacienteId;
        this.medicoId = medicoId;
        this.especialidadId = especialidadId;
        reprogramar(fechaHora, duracionMinutos);
        this.motivo = motivo;
        this.creadoEn = creadoEn;
    }

    public final void reprogramar(LocalDateTime nuevaFechaHora, int nuevaDuracionMinutos) {
        this.fechaHora = nuevaFechaHora;
        this.duracionMinutos = nuevaDuracionMinutos;
        this.fechaHoraFin = nuevaFechaHora.plusMinutes(nuevaDuracionMinutos);
    }

    public Long getId() {
        return id;
    }

    public Long getPacienteId() {
        return pacienteId;
    }

    public void setPacienteId(Long pacienteId) {
        this.pacienteId = pacienteId;
    }

    public Long getMedicoId() {
        return medicoId;
    }

    public void setMedicoId(Long medicoId) {
        this.medicoId = medicoId;
    }

    public Long getEspecialidadId() {
        return especialidadId;
    }

    public void setEspecialidadId(Long especialidadId) {
        this.especialidadId = especialidadId;
    }

    public LocalDateTime getFechaHora() {
        return fechaHora;
    }

    public LocalDateTime getFechaHoraFin() {
        return fechaHoraFin;
    }

    public int getDuracionMinutos() {
        return duracionMinutos;
    }

    public EstadoTurno getEstado() {
        return estado;
    }

    public void setEstado(EstadoTurno estado) {
        this.estado = estado;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public LocalDateTime getCreadoEn() {
        return creadoEn;
    }
}
