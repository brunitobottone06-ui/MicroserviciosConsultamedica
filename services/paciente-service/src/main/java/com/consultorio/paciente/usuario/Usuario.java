package com.consultorio.paciente.usuario;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Cuenta para iniciar sesión. Solo se guarda el hash de la contraseña (BCrypt), nunca la contraseña. */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String usuario;

    @Column(name = "clave_hash", nullable = false, length = 100)
    private String claveHash;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Rol rol;

    /** Solo para cuentas de pacientes: la ficha de paciente asociada. */
    @Column(name = "paciente_id")
    private Long pacienteId;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    protected Usuario() {
        // requerido por JPA
    }

    public Usuario(String usuario, String claveHash, String nombre, Rol rol, Long pacienteId, LocalDateTime creadoEn) {
        this.usuario = usuario;
        this.claveHash = claveHash;
        this.nombre = nombre;
        this.rol = rol;
        this.pacienteId = pacienteId;
        this.creadoEn = creadoEn;
    }

    public Long getId() {
        return id;
    }

    public String getUsuario() {
        return usuario;
    }

    public String getClaveHash() {
        return claveHash;
    }

    public String getNombre() {
        return nombre;
    }

    public Rol getRol() {
        return rol;
    }

    public Long getPacienteId() {
        return pacienteId;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }
}
