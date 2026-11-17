package com.consultorio.paciente.servicio;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consultorio.paciente.api.PacienteRequest;
import com.consultorio.paciente.api.PacienteResponse;
import com.consultorio.paciente.dominio.Paciente;
import com.consultorio.paciente.dominio.PacienteRepository;
import com.consultorio.paciente.error.ConflictoException;
import com.consultorio.paciente.error.RecursoNoEncontradoException;

@Service
@Transactional
public class PacienteService {

    private final PacienteRepository repository;

    public PacienteService(PacienteRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PacienteResponse> listar(String buscar, boolean incluirInactivos) {
        String texto = buscar == null ? "" : buscar.trim();
        return repository.buscar(texto, incluirInactivos).stream().map(PacienteResponse::desde).toList();
    }

    @Transactional(readOnly = true)
    public PacienteResponse obtener(Long id) {
        return PacienteResponse.desde(buscarPorId(id));
    }

    public PacienteResponse crear(PacienteRequest request) {
        if (repository.existsByDni(request.dni())) {
            throw new ConflictoException("Ya existe un paciente con el DNI " + request.dni());
        }
        Paciente paciente = new Paciente(request.nombre().trim(), request.apellido().trim(),
                request.dni(), request.fechaNacimiento());
        copiarDatosOpcionales(request, paciente);
        return PacienteResponse.desde(repository.save(paciente));
    }

    public PacienteResponse actualizar(Long id, PacienteRequest request) {
        Paciente paciente = buscarPorId(id);
        if (repository.existsByDniAndIdNot(request.dni(), id)) {
            throw new ConflictoException("Ya existe otro paciente con el DNI " + request.dni());
        }
        paciente.setNombre(request.nombre().trim());
        paciente.setApellido(request.apellido().trim());
        paciente.setDni(request.dni());
        paciente.setFechaNacimiento(request.fechaNacimiento());
        copiarDatosOpcionales(request, paciente);
        return PacienteResponse.desde(paciente);
    }

    /** Baja lógica: no se borran datos de pacientes con historial; solo se impide darles turnos nuevos. */
    public void darDeBaja(Long id) {
        buscarPorId(id).setActivo(false);
    }

    public PacienteResponse reactivar(Long id) {
        Paciente paciente = buscarPorId(id);
        paciente.setActivo(true);
        return PacienteResponse.desde(paciente);
    }

    private static void copiarDatosOpcionales(PacienteRequest request, Paciente paciente) {
        paciente.setEmail(limpiar(request.email()));
        paciente.setTelefono(limpiar(request.telefono()));
        paciente.setObraSocial(limpiar(request.obraSocial()));
    }

    private Paciente buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el paciente con ID " + id));
    }

    private static String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
