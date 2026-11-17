import type { EstadoTurno } from '../api/tipos'

const DIAS: Record<string, string> = {
  MONDAY: 'lunes', TUESDAY: 'martes', WEDNESDAY: 'miércoles', THURSDAY: 'jueves',
  FRIDAY: 'viernes', SATURDAY: 'sábado', SUNDAY: 'domingo',
}

/** Nombre del día en inglés (como lo devuelve Java) -> castellano. */
export function nombreDia(dia: string): string {
  return DIAS[dia] ?? dia
}

/** Día de la semana de JavaScript (0 = domingo) -> constante de Java (SUNDAY...). */
export function diaJava(fecha: Date): string {
  return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][fecha.getDay()]
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

/** Fecha local de hoy en formato ISO "AAAA-MM-DD". */
export function hoyIso(base: Date = new Date()): string {
  return `${base.getFullYear()}-${dosDigitos(base.getMonth() + 1)}-${dosDigitos(base.getDate())}`
}

/** "2030-03-05" -> "05/03/2030" */
export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** "2030-03-05T10:00:00" -> "05/03/2030 10:00" */
export function formatoFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return `${formatoFecha(iso)} ${iso.slice(11, 16)}`
}

/** "2030-03-05T10:00:00" -> "10:00" */
export function formatoHora(iso: string): string {
  return iso.slice(11, 16)
}

/** "2030-03-05T10:00:00" -> "martes 05/03/2030" */
export function formatoFechaLarga(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return `${nombreDia(diaJava(fecha))} ${formatoFecha(iso)}`
}

export function edad(fechaNacimiento: string, hoy: Date = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number)
  let años = hoy.getFullYear() - anio
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) años--
  return años
}

export function nombreCompleto(persona: { nombre: string; apellido: string } | undefined | null): string {
  return persona ? `${persona.apellido}, ${persona.nombre}` : ''
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "AAAA-MM-DD" -> Date local (sin desfase por zona horaria). */
export function fechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

/** "2030-03-05" -> "martes 5 de marzo" */
export function formatoFechaTexto(iso: string, conAnio = false): string {
  const f = fechaLocal(iso)
  const texto = `${nombreDia(diaJava(f))} ${f.getDate()} de ${MESES[f.getMonth()]}`
  return conAnio ? `${texto} de ${f.getFullYear()}` : texto
}

/** "martes 5 de marzo" -> "Martes 5 de marzo" */
export function mayusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Partes para mostrar una fecha "tipo calendario": { dia: 'mar', numero: 5, mes: 'mar' } */
export function partesFecha(iso: string) {
  const f = fechaLocal(iso)
  return { dia: nombreDia(diaJava(f)).slice(0, 3), numero: f.getDate(), mes: MESES[f.getMonth()].slice(0, 3) }
}

/** Suma días a una fecha ISO "AAAA-MM-DD". */
export function sumarDias(iso: string, dias: number): string {
  const f = fechaLocal(iso)
  f.setDate(f.getDate() + dias)
  return hoyIso(f)
}

/** Saludo según la hora del día. */
export function saludo(ahora: Date = new Date()): string {
  const h = ahora.getHours()
  return h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días" o la fecha. */
export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso)
  const minutos = Math.round((ahora.getTime() - fecha.getTime()) / 60_000)
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return formatoFecha(iso)
}

/** Texto corto para la cantidad: "1 paciente" / "3 pacientes". */
export function cantidad(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

export const TEXTO_ESTADO_TURNO: Record<EstadoTurno, string> = {
  PROGRAMADO: 'Programado',
  CANCELADO: 'Cancelado',
  ATENDIDO: 'Atendido',
}
