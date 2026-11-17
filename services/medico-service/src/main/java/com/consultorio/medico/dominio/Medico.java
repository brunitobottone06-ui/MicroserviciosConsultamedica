package com.consultorio.medico.dominio;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/**
 * Médico del consultorio. Puede atender varias especialidades.
 * Las especialidades viven en OTRO microservicio (y otra base de datos), por eso aquí solo se
 * guardan sus IDs: es una referencia lógica, no una clave foránea entre bases.
 */
@Entity
@Table(name = "medico")
public class Medico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Column(nullable = false, length = 80)
    private String apellido;

    @Column(nullable = false, length = 30)
    private String matricula;

    @Column(length = 120)
    private String email;

    @Column(length = 30)
    private String telefono;

    @Column(nullable = false)
    private boolean activo = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "medico_especialidad", joinColumns = @JoinColumn(name = "medico_id"))
    @Column(name = "especialidad_id", nullable = false)
    private Set<Long> especialidadIds = new HashSet<>();

    protected Medico() {
        // requerido por JPA
    }

    public Medico(String nombre, String apellido, String matricula) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.matricula = matricula;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getMatricula() {
        return matricula;
    }

    public void setMatricula(String matricula) {
        this.matricula = matricula;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public Set<Long> getEspecialidadIds() {
        return especialidadIds;
    }

    public void setEspecialidadIds(Set<Long> especialidadIds) {
        this.especialidadIds.clear();
        this.especialidadIds.addAll(especialidadIds);
    }
}
