import { describe, expect, it } from 'vitest'
import type { Horario, PacienteDatos, TurnoDatos } from '../api/tipos'
import { validarConsulta, validarMedico, validarPaciente, validarTurno } from './validaciones'

const HOY = new Date(2030, 2, 4, 9, 0) // lunes 4/3/2030 09:00
const HORARIO: Horario = {
  apertura: '08:00', cierre: '20:00',
  dias: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  descripcion: 'lunes a viernes de 08:00 a 20:00',
}

const pacienteValido: PacienteDatos = {
  nombre: 'Ana', apellido: 'Torres', dni: '30111222', fechaNacimiento: '1990-05-20', email: '', telefono: '', obraSocial: '',
}

const turnoValido: TurnoDatos = {
  pacienteId: 1, medicoId: 2, especialidadId: 3, fechaHora: '2030-03-05T10:00', duracionMinutos: 30, motivo: '',
}

describe('validarPaciente', () => {
  it('acepta un paciente válido', () => {
    expect(validarPaciente(pacienteValido, HOY)).toEqual({})
  })

  it('informa campos obligatorios y formatos', () => {
    const errores = validarPaciente({ ...pacienteValido, nombre: ' ', dni: '30.111.222', email: 'ana@', fechaNacimiento: '2031-01-01' }, HOY)
    expect(errores).toEqual({
      nombre: 'El nombre es obligatorio',
      dni: 'El DNI debe tener 7 u 8 dígitos, sin puntos',
      email: 'El email no tiene un formato válido',
      fechaNacimiento: 'La fecha de nacimiento debe ser anterior a hoy',
    })
  })
})

describe('validarMedico', () => {
  it('exige al menos una especialidad', () => {
    const errores = validarMedico({ nombre: 'Laura', apellido: 'Gómez', matricula: 'MN 1', email: '', telefono: '', especialidadIds: [] })
    expect(errores.especialidadIds).toBe('Seleccioná al menos una especialidad')
  })
})

describe('validarTurno', () => {
  it('acepta un turno futuro dentro del horario', () => {
    expect(validarTurno(turnoValido, HORARIO, HOY)).toEqual({})
  })

  it('rechaza turnos en el pasado', () => {
    expect(validarTurno({ ...turnoValido, fechaHora: '2030-03-04T08:30' }, HORARIO, HOY).fecha)
      .toBe('El turno debe ser en una fecha y hora futura')
  })

  it('rechaza días sin atención y horarios fuera de rango', () => {
    expect(validarTurno({ ...turnoValido, fechaHora: '2030-03-09T10:00' }, HORARIO, HOY).fecha).toContain('no atiende')
    expect(validarTurno({ ...turnoValido, fechaHora: '2030-03-05T19:45' }, HORARIO, HOY).hora).toContain('entre las 08:00 y las 20:00')
  })

  it('exige paciente, especialidad, médico, fecha y hora', () => {
    const errores = validarTurno({ ...turnoValido, pacienteId: null, medicoId: null, especialidadId: null, fechaHora: 'T' }, HORARIO, HOY)
    expect(Object.keys(errores).sort()).toEqual(['especialidadId', 'fecha', 'hora', 'medicoId', 'pacienteId'])
  })
})

describe('validarConsulta', () => {
  it('exige turno y motivo al registrar', () => {
    const errores = validarConsulta({ turnoId: null, motivo: '', diagnostico: '', tratamiento: '', observaciones: '' }, true)
    expect(errores).toEqual({ turnoId: 'Seleccioná el turno atendido', motivo: 'El motivo de consulta es obligatorio' })
  })
})
