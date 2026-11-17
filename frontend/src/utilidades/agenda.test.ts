import { describe, expect, it } from 'vitest'
import type { Horario, Turno } from '../api/tipos'
import { horaFin, horariosDelDia, proximosDiasDeAtencion } from './agenda'
import { formatoFechaTexto, saludo, tiempoRelativo } from './formato'

const HORARIO: Horario = {
  apertura: '08:00', cierre: '20:00', dias: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], descripcion: '',
}
const LUNES_9 = new Date(2030, 2, 4, 9, 10) // lunes 4/3/2030 09:10

function turno(fechaHora: string, fin: string, estado: Turno['estado'] = 'PROGRAMADO'): Turno {
  return { id: 1, pacienteId: 1, medicoId: 1, especialidadId: 1, fechaHora, fechaHoraFin: fin, duracionMinutos: 30, estado, motivo: null, creadoEn: fechaHora }
}

describe('agenda', () => {
  it('lista solo los días en que atiende el consultorio', () => {
    // Desde el viernes 8/3: viernes, lunes, martes (salta el fin de semana)
    expect(proximosDiasDeAtencion(HORARIO, 3, new Date(2030, 2, 8, 10, 0))).toEqual(['2030-03-08', '2030-03-11', '2030-03-12'])
  })

  it('genera horarios dentro del horario de atención según la duración', () => {
    const horarios = horariosDelDia('2030-03-05', HORARIO, 60, [], LUNES_9)
    expect(horarios[0].hora).toBe('08:00')
    expect(horarios.at(-1)?.hora).toBe('19:00') // 19:00 + 60 min = 20:00 (cierre)
    expect(horarios.every((h) => h.disponible)).toBe(true)
  })

  it('marca como no disponibles los horarios pasados y los superpuestos', () => {
    const horarios = horariosDelDia('2030-03-04', HORARIO, 30, [
      turno('2030-03-04T11:00:00', '2030-03-04T11:30:00'),
      turno('2030-03-04T12:00:00', '2030-03-04T12:30:00', 'CANCELADO'), // los cancelados no ocupan
    ], LUNES_9)
    const de = (hora: string) => horarios.find((h) => h.hora === hora)
    expect(de('09:00')).toMatchObject({ disponible: false, motivo: 'Ya pasó' })
    expect(de('10:45')).toMatchObject({ disponible: false, motivo: 'Ocupado' })
    expect(de('11:15')).toMatchObject({ disponible: false, motivo: 'Ocupado' })
    expect(de('11:30')?.disponible).toBe(true)
    expect(de('12:00')?.disponible).toBe(true)
  })

  it('calcula la hora de finalización', () => {
    expect(horaFin('10:30', 45)).toBe('11:15')
  })
})

describe('formato', () => {
  it('escribe fechas en castellano', () => {
    expect(formatoFechaTexto('2030-03-05')).toBe('martes 5 de marzo')
    expect(formatoFechaTexto('2030-03-05', true)).toBe('martes 5 de marzo de 2030')
  })

  it('saluda según la hora y expresa tiempos relativos', () => {
    expect(saludo(new Date(2030, 0, 1, 9))).toBe('Buenos días')
    expect(saludo(new Date(2030, 0, 1, 15))).toBe('Buenas tardes')
    expect(saludo(new Date(2030, 0, 1, 22))).toBe('Buenas noches')
    const ahora = new Date(2030, 0, 10, 12, 0)
    expect(tiempoRelativo(new Date(2030, 0, 10, 11, 55).toISOString(), ahora)).toBe('hace 5 min')
    expect(tiempoRelativo(new Date(2030, 0, 9, 11, 0).toISOString(), ahora)).toBe('ayer')
  })
})
