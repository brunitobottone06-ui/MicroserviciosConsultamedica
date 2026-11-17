/**
 * Validaciones del lado del cliente. Repiten las reglas del backend para avisar antes de enviar,
 * pero el backend SIEMPRE vuelve a validar (nunca se confía solo en el navegador).
 * Cada función devuelve un objeto { campo: mensaje }; si está vacío, el formulario es válido.
 */
import type { ConsultaDatos, EspecialidadDatos, Horario, MedicoDatos, PacienteDatos, TurnoDatos } from '../api/tipos'
import { diaJava, hoyIso } from './formato'

export type Errores = Record<string, string>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TELEFONO = /^[0-9+()\s-]{6,30}$/
const DNI = /^\d{7,8}$/
const MATRICULA = /^[A-Za-z0-9 .-]{3,30}$/

function obligatorio(errores: Errores, campo: string, valor: string, mensaje: string, max?: number) {
  if (!valor || !valor.trim()) {
    errores[campo] = mensaje
  } else if (max && valor.trim().length > max) {
    errores[campo] = `No puede superar los ${max} caracteres`
  }
}

function opcionalMax(errores: Errores, campo: string, valor: string, max: number) {
  if (valor && valor.trim().length > max) errores[campo] = `No puede superar los ${max} caracteres`
}

function contactoOpcional(errores: Errores, email: string, telefono: string) {
  if (email.trim() && !EMAIL.test(email.trim())) errores.email = 'El email no tiene un formato válido'
  if (telefono.trim() && !TELEFONO.test(telefono.trim())) {
    errores.telefono = 'Usá solo números, espacios, +, paréntesis o guiones (6 a 30 caracteres)'
  }
}

export function validarPaciente(d: PacienteDatos, hoy: Date = new Date()): Errores {
  const e: Errores = {}
  obligatorio(e, 'nombre', d.nombre, 'El nombre es obligatorio', 80)
  obligatorio(e, 'apellido', d.apellido, 'El apellido es obligatorio', 80)
  if (!d.dni.trim()) e.dni = 'El DNI es obligatorio'
  else if (!DNI.test(d.dni.trim())) e.dni = 'El DNI debe tener 7 u 8 dígitos, sin puntos'
  if (!d.fechaNacimiento) e.fechaNacimiento = 'La fecha de nacimiento es obligatoria'
  else if (d.fechaNacimiento >= hoyIso(hoy)) e.fechaNacimiento = 'La fecha de nacimiento debe ser anterior a hoy'
  contactoOpcional(e, d.email, d.telefono)
  opcionalMax(e, 'obraSocial', d.obraSocial, 100)
  return e
}

export function validarMedico(d: MedicoDatos): Errores {
  const e: Errores = {}
  obligatorio(e, 'nombre', d.nombre, 'El nombre es obligatorio', 80)
  obligatorio(e, 'apellido', d.apellido, 'El apellido es obligatorio', 80)
  if (!d.matricula.trim()) e.matricula = 'La matrícula es obligatoria'
  else if (!MATRICULA.test(d.matricula.trim())) e.matricula = 'Entre 3 y 30 caracteres: letras, números, espacios, puntos o guiones'
  contactoOpcional(e, d.email, d.telefono)
  if (d.especialidadIds.length === 0) e.especialidadIds = 'Seleccioná al menos una especialidad'
  return e
}

export function validarEspecialidad(d: EspecialidadDatos): Errores {
  const e: Errores = {}
  obligatorio(e, 'nombre', d.nombre, 'El nombre es obligatorio', 100)
  opcionalMax(e, 'descripcion', d.descripcion, 500)
  return e
}

/** Valida un turno; si se conoce el horario del consultorio, también verifica que esté dentro de él. */
export function validarTurno(d: TurnoDatos, horario: Horario | null, ahora: Date = new Date()): Errores {
  const e: Errores = {}
  if (!d.pacienteId) e.pacienteId = 'Seleccioná un paciente'
  if (!d.especialidadId) e.especialidadId = 'Seleccioná una especialidad'
  if (!d.medicoId) e.medicoId = 'Seleccioná un médico'
  if (!Number.isInteger(d.duracionMinutos) || d.duracionMinutos < 10 || d.duracionMinutos > 120) {
    e.duracionMinutos = 'La duración debe estar entre 10 y 120 minutos'
  }
  opcionalMax(e, 'motivo', d.motivo, 255)

  const [fecha, hora] = d.fechaHora.split('T')
  if (!fecha) e.fecha = 'Elegí la fecha del turno'
  if (!hora) e.hora = 'Elegí la hora del turno'
  if (fecha && hora) {
    const inicio = new Date(`${fecha}T${hora}`)
    if (Number.isNaN(inicio.getTime())) {
      e.fecha = 'La fecha u hora no es válida'
    } else if (inicio <= ahora) {
      e.fecha = 'El turno debe ser en una fecha y hora futura'
    } else if (horario) {
      const fin = new Date(inicio.getTime() + (d.duracionMinutos || 0) * 60_000)
      const horaInicio = hora.slice(0, 5)
      const horaFin = `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`
      if (!horario.dias.includes(diaJava(inicio))) {
        e.fecha = `Ese día el consultorio no atiende (${horario.descripcion})`
      } else if (horaInicio < horario.apertura || horaFin > horario.cierre || fin.getDate() !== inicio.getDate()) {
        e.hora = `El turno debe empezar y terminar entre las ${horario.apertura} y las ${horario.cierre}`
      }
    }
  }
  return e
}

export function validarConsulta(d: ConsultaDatos & { turnoId?: number | null }, exigirTurno: boolean): Errores {
  const e: Errores = {}
  if (exigirTurno && !d.turnoId) e.turnoId = 'Seleccioná el turno atendido'
  obligatorio(e, 'motivo', d.motivo, 'El motivo de consulta es obligatorio', 500)
  opcionalMax(e, 'diagnostico', d.diagnostico, 2000)
  opcionalMax(e, 'tratamiento', d.tratamiento, 2000)
  opcionalMax(e, 'observaciones', d.observaciones, 2000)
  return e
}

export function hayErrores(errores: Errores): boolean {
  return Object.keys(errores).length > 0
}

/** Copia de los errores sin el del campo indicado (se usa al corregir un campo). */
export function sinError(errores: Errores, ...campos: string[]): Errores {
  const copia = { ...errores }
  for (const campo of campos) delete copia[campo]
  return copia
}
