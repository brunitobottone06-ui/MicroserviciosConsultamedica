package com.consultorio.paciente.usuario;

/**
 * Roles del sistema:
 * <ul>
 *   <li>ADMINISTRATIVO: recepción. Gestiona pacientes, médicos, especialidades, turnos y usuarios.</li>
 *   <li>MEDICO: consulta la información y registra las consultas (datos clínicos).</li>
 *   <li>PACIENTE: ve sus datos, pide y cancela SUS turnos y usa el asistente.</li>
 * </ul>
 */
public enum Rol {
    ADMINISTRATIVO,
    MEDICO,
    PACIENTE
}
