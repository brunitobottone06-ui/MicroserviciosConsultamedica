package com.consultorio.medico.servicio;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consultorio.medico.api.MedicoRequest;
import com.consultorio.medico.api.MedicoResponse;
import com.consultorio.medico.cliente.EspecialidadClient;
import com.consultorio.medico.cliente.EspecialidadRemota;
import com.consultorio.medico.dominio.Medico;
import com.consultorio.medico.dominio.MedicoRepository;
import com.consultorio.medico.error.ConflictoException;
import com.consultorio.medico.error.RecursoNoEncontradoException;
import com.consultorio.medico.error.ReglaNegocioException;

@Service
@Transactional
public class MedicoService {

    private final MedicoRepository repository;
    private final EspecialidadClient especialidadClient;

    public MedicoService(MedicoRepository repository, EspecialidadClient especialidadClient) {
        this.repository = repository;
        this.especialidadClient = especialidadClient;
    }

    @Transactional(readOnly = true)
    public List<MedicoResponse> listar(Long especialidadId, boolean incluirInactivos) {
        List<Medico> medicos;
        if (especialidadId != null) {
            medicos = repository.buscarPorEspecialidad(especialidadId, incluirInactivos);
        } else if (incluirInactivos) {
            medicos = repository.findAllByOrderByApellidoAscNombreAsc();
        } else {
            medicos = repository.findByActivoTrueOrderByApellidoAscNombreAsc();
        }
        return medicos.stream().map(MedicoResponse::desde).toList();
    }

    @Transactional(readOnly = true)
    public MedicoResponse obtener(Long id) {
        return MedicoResponse.desde(buscar(id));
    }

    public MedicoResponse crear(MedicoRequest request) {
        String matricula = request.matricula().trim();
        if (repository.existsByMatriculaIgnoreCase(matricula)) {
            throw new ConflictoException("Ya existe un médico con la matrícula " + matricula);
        }
        validarEspecialidadesNuevas(request.especialidadIds(), Set.of());

        Medico medico = new Medico(request.nombre().trim(), request.apellido().trim(), matricula);
        copiarDatosOpcionales(request, medico);
        return MedicoResponse.desde(repository.save(medico));
    }

    public MedicoResponse actualizar(Long id, MedicoRequest request) {
        Medico medico = buscar(id);
        String matricula = request.matricula().trim();
        if (repository.existsByMatriculaIgnoreCaseAndIdNot(matricula, id)) {
            throw new ConflictoException("Ya existe otro médico con la matrícula " + matricula);
        }
        // Solo se validan las especialidades que se AGREGAN: si una que ya tenía fue dada de baja,
        // igual se puede editar el resto de los datos del médico.
        validarEspecialidadesNuevas(request.especialidadIds(), medico.getEspecialidadIds());

        medico.setNombre(request.nombre().trim());
        medico.setApellido(request.apellido().trim());
        medico.setMatricula(matricula);
        copiarDatosOpcionales(request, medico);
        return MedicoResponse.desde(medico);
    }

    /** Baja lógica: el médico no podrá recibir turnos nuevos, pero sigue en el historial. */
    public void darDeBaja(Long id) {
        buscar(id).setActivo(false);
    }

    public MedicoResponse reactivar(Long id) {
        Medico medico = buscar(id);
        medico.setActivo(true);
        return MedicoResponse.desde(medico);
    }

    private void validarEspecialidadesNuevas(Set<Long> solicitadas, Set<Long> actuales) {
        for (Long especialidadId : solicitadas) {
            if (actuales.contains(especialidadId)) {
                continue;
            }
            EspecialidadRemota especialidad = especialidadClient.buscar(especialidadId)
                    .orElseThrow(() -> new ReglaNegocioException(
                            "La especialidad con ID " + especialidadId + " no existe"));
            if (!especialidad.activa()) {
                throw new ReglaNegocioException(
                        "La especialidad '" + especialidad.nombre() + "' está dada de baja y no puede asignarse");
            }
        }
    }

    private static void copiarDatosOpcionales(MedicoRequest request, Medico medico) {
        medico.setEmail(limpiar(request.email()));
        medico.setTelefono(limpiar(request.telefono()));
        medico.setEspecialidadIds(request.especialidadIds());
    }

    private Medico buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el médico con ID " + id));
    }

    private static String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
