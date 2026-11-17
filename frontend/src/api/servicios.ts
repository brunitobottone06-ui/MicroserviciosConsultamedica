/**
 * Funciones para llamar a cada microservicio. Cada grupo corresponde a UN microservicio.
 */
import { consulta, solicitar } from './cliente'
import type {
  Consulta, ConsultaDatos, Especialidad, EspecialidadDatos, EstadoAsistente, EstadoTurno, Horario, MensajePrevio,
  Medico, MedicoDatos, Paciente, PacienteDatos, RespuestaAsistente, Turno, TurnoDatos,
} from './tipos'
import type { Sesion, UsuarioSesion } from '../sesion/almacen'

/** Convierte "" en null para los campos opcionales. */
function sinVacios<T extends object>(datos: T): T {
  const resultado: Record<string, unknown> = {}
  for (const [clave, valor] of Object.entries(datos)) {
    resultado[clave] = typeof valor === 'string' && valor.trim() === '' ? null : valor
  }
  return resultado as T
}

/** Inicio de sesión y cuentas (los atiende paciente-service). */
export const authApi = {
  iniciarSesion: (usuario: string, clave: string) =>
    solicitar<Sesion>('/api/auth/login', { metodo: 'POST', cuerpo: { usuario, clave } }),
  registrarse: (paciente: PacienteDatos, clave: string) =>
    solicitar<Sesion>('/api/auth/registro', { metodo: 'POST', cuerpo: { paciente: sinVacios(paciente), clave } }),
}

export interface NuevoUsuario {
  usuario: string
  nombre: string
  clave: string
  rol: 'ADMINISTRATIVO' | 'MEDICO'
}

export const usuariosApi = {
  listar: () => solicitar<UsuarioSesion[]>('/api/usuarios'),
  crear: (datos: NuevoUsuario) => solicitar<UsuarioSesion>('/api/usuarios', { metodo: 'POST', cuerpo: datos }),
  activar: (id: number) => solicitar<UsuarioSesion>(`/api/usuarios/${id}/activar`, { metodo: 'PATCH' }),
  desactivar: (id: number) => solicitar<UsuarioSesion>(`/api/usuarios/${id}/desactivar`, { metodo: 'PATCH' }),
}

export const pacientesApi = {
  /** Recepción habilita el acceso web de un paciente (su usuario será su DNI). */
  habilitarAcceso: (id: number, clave: string) =>
    solicitar<UsuarioSesion>(`/api/pacientes/${id}/acceso`, { metodo: 'POST', cuerpo: { clave } }),
  listar: (filtros: { buscar?: string; incluirInactivos?: boolean } = {}) =>
    solicitar<Paciente[]>(`/api/pacientes${consulta(filtros)}`),
  obtener: (id: number) => solicitar<Paciente>(`/api/pacientes/${id}`),
  crear: (datos: PacienteDatos) => solicitar<Paciente>('/api/pacientes', { metodo: 'POST', cuerpo: sinVacios(datos) }),
  actualizar: (id: number, datos: PacienteDatos) =>
    solicitar<Paciente>(`/api/pacientes/${id}`, { metodo: 'PUT', cuerpo: sinVacios(datos) }),
  darDeBaja: (id: number) => solicitar<void>(`/api/pacientes/${id}`, { metodo: 'DELETE' }),
  reactivar: (id: number) => solicitar<Paciente>(`/api/pacientes/${id}/reactivar`, { metodo: 'PATCH' }),
}

export const medicosApi = {
  listar: (filtros: { especialidadId?: number; incluirInactivos?: boolean } = {}) =>
    solicitar<Medico[]>(`/api/medicos${consulta(filtros)}`),
  obtener: (id: number) => solicitar<Medico>(`/api/medicos/${id}`),
  crear: (datos: MedicoDatos) => solicitar<Medico>('/api/medicos', { metodo: 'POST', cuerpo: sinVacios(datos) }),
  actualizar: (id: number, datos: MedicoDatos) =>
    solicitar<Medico>(`/api/medicos/${id}`, { metodo: 'PUT', cuerpo: sinVacios(datos) }),
  darDeBaja: (id: number) => solicitar<void>(`/api/medicos/${id}`, { metodo: 'DELETE' }),
  reactivar: (id: number) => solicitar<Medico>(`/api/medicos/${id}/reactivar`, { metodo: 'PATCH' }),
}

export const especialidadesApi = {
  listar: (filtros: { incluirInactivas?: boolean } = {}) =>
    solicitar<Especialidad[]>(`/api/especialidades${consulta(filtros)}`),
  obtener: (id: number) => solicitar<Especialidad>(`/api/especialidades/${id}`),
  crear: (datos: EspecialidadDatos) =>
    solicitar<Especialidad>('/api/especialidades', { metodo: 'POST', cuerpo: sinVacios(datos) }),
  actualizar: (id: number, datos: EspecialidadDatos) =>
    solicitar<Especialidad>(`/api/especialidades/${id}`, { metodo: 'PUT', cuerpo: sinVacios(datos) }),
  darDeBaja: (id: number) => solicitar<void>(`/api/especialidades/${id}`, { metodo: 'DELETE' }),
  reactivar: (id: number) => solicitar<Especialidad>(`/api/especialidades/${id}/reactivar`, { metodo: 'PATCH' }),
}

export interface FiltrosTurnos {
  pacienteId?: number
  medicoId?: number
  especialidadId?: number
  estado?: EstadoTurno
  desde?: string
  hasta?: string
}

export const turnosApi = {
  listar: (filtros: FiltrosTurnos = {}) => solicitar<Turno[]>(`/api/turnos${consulta({ ...filtros })}`),
  obtener: (id: number) => solicitar<Turno>(`/api/turnos/${id}`),
  horario: () => solicitar<Horario>('/api/turnos/horario'),
  crear: (datos: TurnoDatos) => solicitar<Turno>('/api/turnos', { metodo: 'POST', cuerpo: sinVacios(datos) }),
  actualizar: (id: number, datos: TurnoDatos) =>
    solicitar<Turno>(`/api/turnos/${id}`, { metodo: 'PUT', cuerpo: sinVacios(datos) }),
  cancelar: (id: number) => solicitar<Turno>(`/api/turnos/${id}/cancelar`, { metodo: 'PATCH' }),
  eliminar: (id: number) => solicitar<void>(`/api/turnos/${id}`, { metodo: 'DELETE' }),
}

export const consultasApi = {
  listar: (filtros: { pacienteId?: number; medicoId?: number; turnoId?: number } = {}) =>
    solicitar<Consulta[]>(`/api/consultas${consulta(filtros)}`),
  obtener: (id: number) => solicitar<Consulta>(`/api/consultas/${id}`),
  crear: (datos: ConsultaDatos & { turnoId: number | null }) =>
    solicitar<Consulta>('/api/consultas', { metodo: 'POST', cuerpo: sinVacios(datos) }),
  actualizar: (id: number, datos: ConsultaDatos) =>
    solicitar<Consulta>(`/api/consultas/${id}`, { metodo: 'PUT', cuerpo: sinVacios(datos) }),
  eliminar: (id: number) => solicitar<void>(`/api/consultas/${id}`, { metodo: 'DELETE' }),
}

export const asistenteApi = {
  estado: () => solicitar<EstadoAsistente>('/api/asistente/estado', { timeoutMs: 8_000 }),
  // Un modelo local en CPU puede tardar: se espera hasta 3 minutos.
  preguntar: (mensaje: string, historial: MensajePrevio[]) =>
    solicitar<RespuestaAsistente>('/api/asistente/chat', {
      metodo: 'POST', cuerpo: { mensaje, historial }, timeoutMs: 180_000,
    }),
}

export type NombreServicio = 'pacientes' | 'medicos' | 'especialidades' | 'turnos' | 'consultas'

/** Health check de un microservicio (Spring Boot Actuator), a través del proxy. */
export const saludApi = {
  consultar: (servicio: NombreServicio) =>
    solicitar<{ status: string; components?: Record<string, { status: string }> }>(`/estado/${servicio}`, { timeoutMs: 5_000 }),
}
