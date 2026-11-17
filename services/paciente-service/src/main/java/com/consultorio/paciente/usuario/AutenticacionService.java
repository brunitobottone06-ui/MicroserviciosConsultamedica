package com.consultorio.paciente.usuario;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consultorio.paciente.api.PacienteResponse;
import com.consultorio.paciente.dominio.Paciente;
import com.consultorio.paciente.dominio.PacienteRepository;
import com.consultorio.paciente.error.ConflictoException;
import com.consultorio.paciente.error.CredencialesInvalidasException;
import com.consultorio.paciente.error.RecursoNoEncontradoException;
import com.consultorio.paciente.error.ReglaNegocioException;
import com.consultorio.paciente.servicio.PacienteService;
import com.consultorio.paciente.usuario.DtosUsuario.NuevoUsuarioRequest;
import com.consultorio.paciente.usuario.DtosUsuario.RegistroRequest;
import com.consultorio.paciente.usuario.DtosUsuario.SesionResponse;
import com.consultorio.paciente.usuario.DtosUsuario.UsuarioResponse;

@Service
@Transactional
public class AutenticacionService {

    private static final String CREDENCIALES_INVALIDAS = "Usuario o contraseña incorrectos.";
    private static final String ACCESO_DESHABILITADO =
            "Tu acceso está deshabilitado. Comunicate con la recepción del consultorio.";

    private final UsuarioRepository usuarios;
    private final PacienteRepository pacientes;
    private final PacienteService pacienteService;
    private final PasswordEncoder codificadorClaves;
    private final EmisorDeTokens emisor;
    /** Hash de una contraseña cualquiera: se usa para que un usuario inexistente demore lo mismo que uno real. */
    private final String hashFicticio;

    public AutenticacionService(UsuarioRepository usuarios, PacienteRepository pacientes, PacienteService pacienteService,
                                PasswordEncoder codificadorClaves, EmisorDeTokens emisor) {
        this.usuarios = usuarios;
        this.pacientes = pacientes;
        this.pacienteService = pacienteService;
        this.codificadorClaves = codificadorClaves;
        this.emisor = emisor;
        this.hashFicticio = codificadorClaves.encode("contrasena-ficticia-para-igualar-tiempos");
    }

    /**
     * Inicio de sesión. Si el usuario no existe o la contraseña no coincide, el mensaje es el mismo
     * (no revela qué usuarios existen).
     */
    @Transactional(readOnly = true)
    public SesionResponse iniciarSesion(String nombreUsuario, String clave) {
        Optional<Usuario> encontrado = usuarios.findByUsuarioIgnoreCase(nombreUsuario.trim());
        String hash = encontrado.map(Usuario::getClaveHash).orElse(hashFicticio);
        boolean claveCorrecta = codificadorClaves.matches(clave, hash);
        if (encontrado.isEmpty() || !claveCorrecta) {
            throw new CredencialesInvalidasException(CREDENCIALES_INVALIDAS);
        }
        Usuario usuario = encontrado.get();
        if (!usuario.isActivo()) {
            throw new CredencialesInvalidasException(ACCESO_DESHABILITADO);
        }
        if (usuario.getRol() == Rol.PACIENTE
                && !pacientes.findById(usuario.getPacienteId()).map(Paciente::isActivo).orElse(false)) {
            throw new CredencialesInvalidasException(ACCESO_DESHABILITADO);
        }
        return sesion(usuario);
    }

    /** Un paciente nuevo crea su cuenta: se crea su ficha y su usuario (que es su DNI). */
    public SesionResponse registrarPaciente(RegistroRequest pedido) {
        String dni = pedido.paciente().dni();
        if (pacientes.existsByDni(dni) || usuarios.existsByUsuarioIgnoreCase(dni)) {
            throw new ConflictoException("Ya hay un paciente registrado con ese DNI. Si ya te atendiste en el consultorio, "
                    + "pedí en recepción que habiliten tu acceso.");
        }
        PacienteResponse paciente = pacienteService.crear(pedido.paciente());
        Usuario usuario = usuarios.save(new Usuario(dni, codificadorClaves.encode(pedido.clave()),
                paciente.nombre() + " " + paciente.apellido(), Rol.PACIENTE, paciente.id(), LocalDateTime.now()));
        return sesion(usuario);
    }

    /** Recepción habilita el acceso web de un paciente ya cargado. Su usuario será su DNI. */
    public UsuarioResponse habilitarAccesoPaciente(Long pacienteId, String claveInicial) {
        Paciente paciente = pacientes.findById(pacienteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el paciente con ID " + pacienteId));
        if (!paciente.isActivo()) {
            throw new ReglaNegocioException("El paciente está dado de baja: reactivalo antes de habilitar su acceso");
        }
        if (usuarios.existsByPacienteId(pacienteId) || usuarios.existsByUsuarioIgnoreCase(paciente.getDni())) {
            throw new ConflictoException("Este paciente ya tiene acceso al sistema (usuario: su DNI)");
        }
        Usuario usuario = usuarios.save(new Usuario(paciente.getDni(), codificadorClaves.encode(claveInicial),
                paciente.getNombre() + " " + paciente.getApellido(), Rol.PACIENTE, pacienteId, LocalDateTime.now()));
        return UsuarioResponse.desde(usuario);
    }

    /** Alta de cuentas del personal (administrativo o médico). */
    public UsuarioResponse crearUsuarioPersonal(NuevoUsuarioRequest pedido) {
        if (pedido.rol() == Rol.PACIENTE) {
            throw new ReglaNegocioException("Las cuentas de pacientes se crean desde la ficha del paciente "
                    + "(\"Habilitar acceso\") o con \"Crear cuenta\" en la pantalla de inicio de sesión");
        }
        if (usuarios.existsByUsuarioIgnoreCase(pedido.usuario())) {
            throw new ConflictoException("Ya existe el usuario '" + pedido.usuario() + "'");
        }
        Usuario usuario = usuarios.save(new Usuario(pedido.usuario(), codificadorClaves.encode(pedido.clave()),
                pedido.nombre().trim(), pedido.rol(), null, LocalDateTime.now()));
        return UsuarioResponse.desde(usuario);
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listarUsuarios() {
        return usuarios.findAllByOrderByRolAscUsuarioAsc().stream().map(UsuarioResponse::desde).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorNombre(String nombreUsuario) {
        return usuarios.findByUsuarioIgnoreCase(nombreUsuario).map(UsuarioResponse::desde)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + nombreUsuario));
    }

    /** Activa o desactiva una cuenta. Nadie puede desactivar su propia cuenta (evita quedarse sin administradores). */
    public UsuarioResponse cambiarEstado(Long id, boolean activo, String quienLoPide) {
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario con ID " + id));
        if (!activo && usuario.getUsuario().equalsIgnoreCase(quienLoPide)) {
            throw new ReglaNegocioException("No podés desactivar tu propia cuenta");
        }
        usuario.setActivo(activo);
        return UsuarioResponse.desde(usuario);
    }

    private SesionResponse sesion(Usuario usuario) {
        EmisorDeTokens.TokenEmitido token = emisor.emitir(usuario);
        return new SesionResponse(token.token(), token.expiraEn(), UsuarioResponse.desde(usuario));
    }
}
