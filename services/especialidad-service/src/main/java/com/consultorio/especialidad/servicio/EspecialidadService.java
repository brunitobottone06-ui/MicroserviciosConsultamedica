package com.consultorio.especialidad.servicio;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consultorio.especialidad.api.EspecialidadRequest;
import com.consultorio.especialidad.api.EspecialidadResponse;
import com.consultorio.especialidad.dominio.Especialidad;
import com.consultorio.especialidad.dominio.EspecialidadRepository;
import com.consultorio.especialidad.error.ConflictoException;
import com.consultorio.especialidad.error.RecursoNoEncontradoException;

@Service
@Transactional
public class EspecialidadService {

    private final EspecialidadRepository repository;

    public EspecialidadService(EspecialidadRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<EspecialidadResponse> listar(boolean incluirInactivas) {
        List<Especialidad> especialidades = incluirInactivas
                ? repository.findAllByOrderByNombreAsc()
                : repository.findByActivaTrueOrderByNombreAsc();
        return especialidades.stream().map(EspecialidadResponse::desde).toList();
    }

    @Transactional(readOnly = true)
    public EspecialidadResponse obtener(Long id) {
        return EspecialidadResponse.desde(buscar(id));
    }

    public EspecialidadResponse crear(EspecialidadRequest request) {
        String nombre = request.nombre().trim();
        if (repository.existsByNombreIgnoreCase(nombre)) {
            throw new ConflictoException("Ya existe una especialidad llamada '" + nombre + "'");
        }
        Especialidad especialidad = new Especialidad(nombre, limpiar(request.descripcion()));
        return EspecialidadResponse.desde(repository.save(especialidad));
    }

    public EspecialidadResponse actualizar(Long id, EspecialidadRequest request) {
        Especialidad especialidad = buscar(id);
        String nombre = request.nombre().trim();
        if (repository.existsByNombreIgnoreCaseAndIdNot(nombre, id)) {
            throw new ConflictoException("Ya existe otra especialidad llamada '" + nombre + "'");
        }
        especialidad.setNombre(nombre);
        especialidad.setDescripcion(limpiar(request.descripcion()));
        return EspecialidadResponse.desde(especialidad);
    }

    /** Baja lógica: la especialidad deja de ofrecerse, pero sigue existiendo para el historial. */
    public void darDeBaja(Long id) {
        buscar(id).setActiva(false);
    }

    public EspecialidadResponse reactivar(Long id) {
        Especialidad especialidad = buscar(id);
        especialidad.setActiva(true);
        return EspecialidadResponse.desde(especialidad);
    }

    private Especialidad buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la especialidad con ID " + id));
    }

    private static String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
