/** Tipos que reflejan los JSON que devuelven los microservicios. */

export interface Especialidad {
  id: number
  nombre: string
  descripcion: string | null
  activa: boolean
}
export interface EspecialidadDatos {
  nombre: string
  descripcion: string
}

export interface Medico {
  id: number
  nombre: string
  apellido: string
  matricula: string
  email: string | null
  telefono: string | null
  activo: boolean
  especialidadIds: number[]
}
export interface MedicoDatos {
  nombre: string
  apellido: string
  matricula: string
  email: string
  telefono: string
  especialidadIds: number[]
}

export interface Paciente {
  id: number
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  email: string | null
  telefono: string | null
  obraSocial: string | null
  activo: boolean
}
export interface PacienteDatos {
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string
  email: string
  telefono: string
  obraSocial: string
}

export type EstadoTurno = 'PROGRAMADO' | 'CANCELADO' | 'ATENDIDO'

export interface Turno {
  id: number
  pacienteId: number
  medicoId: number
  especialidadId: number
  /** Fecha y hora local, formato ISO sin zona: "2030-03-05T10:00:00" */
  fechaHora: string
  fechaHoraFin: string
  duracionMinutos: number
  estado: EstadoTurno
  motivo: string | null
  creadoEn: string
}
export interface TurnoDatos {
  pacienteId: number | null
  medicoId: number | null
  especialidadId: number | null
  fechaHora: string
  duracionMinutos: number
  motivo: string
}

export interface Horario {
  apertura: string
  cierre: string
  dias: string[]
  descripcion: string
}

export interface Consulta {
  id: number
  turnoId: number
  pacienteId: number
  medicoId: number
  especialidadId: number
  fechaTurno: string
  registradaEn: string
  motivo: string
  diagnostico: string | null
  tratamiento: string | null
  observaciones: string | null
}
export interface ConsultaDatos {
  motivo: string
  diagnostico: string
  tratamiento: string
  observaciones: string
}

export interface EstadoAsistente {
  habilitado: boolean
  disponible: boolean
  modelo: string
  motivo: string | null
}
export interface RespuestaAsistente {
  respuesta: string
  origen: 'MODELO' | 'REGLA_SEGURIDAD'
  datosPersonalesOcultados: boolean
}
export interface MensajePrevio {
  rol: 'USUARIO' | 'ASISTENTE'
  texto: string
}
