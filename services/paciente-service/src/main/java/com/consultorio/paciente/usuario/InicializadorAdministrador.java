package com.consultorio.paciente.usuario;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Al iniciar, si todavía no existe ningún usuario ADMINISTRATIVO, crea uno con los datos de
 * ADMIN_USUARIO y ADMIN_CLAVE (archivo .env). Sin este primer usuario nadie podría entrar al sistema.
 * Si ya existe un administrativo, no hace nada (no pisa contraseñas cambiadas después).
 */
@Component
public class InicializadorAdministrador implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InicializadorAdministrador.class);

    private final UsuarioRepository usuarios;
    private final PasswordEncoder codificadorClaves;
    private final String usuario;
    private final String clave;

    public InicializadorAdministrador(UsuarioRepository usuarios, PasswordEncoder codificadorClaves,
                                      @Value("${seguridad.admin.usuario:admin}") String usuario,
                                      @Value("${seguridad.admin.clave:}") String clave) {
        this.usuarios = usuarios;
        this.codificadorClaves = codificadorClaves;
        this.usuario = usuario;
        this.clave = clave;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (usuarios.existsByRol(Rol.ADMINISTRATIVO)) {
            return;
        }
        if (clave == null || clave.length() < 8) {
            log.warn("No hay usuarios administrativos y ADMIN_CLAVE no está definida (mínimo 8 caracteres): "
                    + "no se pudo crear el administrador inicial");
            return;
        }
        usuarios.save(new Usuario(usuario, codificadorClaves.encode(clave), "Administración", Rol.ADMINISTRATIVO,
                null, LocalDateTime.now()));
        log.info("Se creó el usuario administrativo inicial '{}'", usuario);
    }
}
