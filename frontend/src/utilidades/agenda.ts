/**
 * Cálculos de agenda para la reserva de turnos: días de atención y horarios disponibles.
 * Se basan en el horario REAL que expone turno-service (GET /api/turnos/horario) y en los turnos
 * ya programados. El backend vuelve a validar todo al confirmar.
 */
import type { Horario, Turno } from '../api/tipos'
import { diaJava, hoyIso, sumarDias } from './formato'

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function aHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

/** Próximos días (desde hoy) en que el consultorio atiende. */
export function proximosDiasDeAtencion(horario: Horario, cantidad: number, ahora: Date = new Date()): string[] {
  const dias: string[] = []
  let fecha = hoyIso(ahora)
  for (let i = 0; i < 60 && dias.length < cantidad; i++) {
    const [a, m, d] = fecha.split('-').map(Number)
    if (horario.dias.includes(diaJava(new Date(a, m - 1, d)))) dias.push(fecha)
    fecha = sumarDias(fecha, 1)
  }
  return dias
}

export interface HorarioPosible {
  hora: string
  disponible: boolean
  /** Motivo por el que no se puede elegir (para mostrarlo al usuario). */
  motivo?: string
}

/**
 * Horarios de inicio posibles para un día: cada {paso} minutos, de forma que el turno completo
 * (inicio + duración) quede dentro del horario de atención. Se marcan como no disponibles los que ya
 * pasaron y los que se superponen con turnos programados conocidos.
 */
export function horariosDelDia(fecha: string, horario: Horario, duracion: number, ocupados: Turno[],
                               ahora: Date = new Date(), paso = 15): HorarioPosible[] {
  const inicio = aMinutos(horario.apertura)
  const fin = aMinutos(horario.cierre)
  const ocupadosDelDia = ocupados
    .filter((t) => t.estado === 'PROGRAMADO' && t.fechaHora.startsWith(fecha))
    .map((t) => ({ desde: aMinutos(t.fechaHora.slice(11, 16)), hasta: aMinutos(t.fechaHoraFin.slice(11, 16)) }))
  const esHoy = fecha === hoyIso(ahora)
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()

  const resultado: HorarioPosible[] = []
  for (let m = inicio; m + duracion <= fin; m += paso) {
    const hora = aHora(m)
    if (esHoy && m <= minutosAhora) {
      resultado.push({ hora, disponible: false, motivo: 'Ya pasó' })
    } else if (ocupadosDelDia.some((o) => m < o.hasta && m + duracion > o.desde)) {
      resultado.push({ hora, disponible: false, motivo: 'Ocupado' })
    } else {
      resultado.push({ hora, disponible: true })
    }
  }
  return resultado
}

/** Hora de finalización: "10:30" + 45 -> "11:15". */
export function horaFin(hora: string, duracion: number): string {
  return aHora(aMinutos(hora) + duracion)
}
