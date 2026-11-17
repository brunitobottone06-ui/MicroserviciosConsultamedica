import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizarEn, sesionDePrueba, simularFetch, type RutaSimulada } from '../../test/utilidades'
import { FormularioTurno } from './FormularioTurno'

const ANA = { id: 7, nombre: 'Ana', apellido: 'Torres', dni: '30111222', fechaNacimiento: '1983-04-12', email: null, telefono: null, obraSocial: null, activo: true }
const HORARIO = { apertura: '08:00', cierre: '20:00', dias: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], descripcion: 'lunes a viernes de 08:00 a 20:00' }

/** Próximo martes (al menos 7 días adelante), en formato AAAA-MM-DD. */
function proximoMartes(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7 + ((9 - d.getDay()) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rutasBase(ocupados: unknown[] = []): RutaSimulada[] {
  return [
    { url: '/api/pacientes/7', cuerpo: ANA },
    { url: '/api/pacientes?', cuerpo: [ANA] },
    { url: '/api/especialidades', cuerpo: [{ id: 3, nombre: 'Cardiología', descripcion: null, activa: true }] },
    { url: '/api/turnos/horario', cuerpo: HORARIO },
    { url: '/api/medicos?especialidadId=3', cuerpo: [{ id: 1, nombre: 'Laura', apellido: 'Gómez', matricula: 'MN 1', email: null, telefono: null, activo: true, especialidadIds: [3] }] },
    { url: '/api/turnos?', cuerpo: ocupados },
  ]
}

/** Completa el paso 1 como lo haría una persona: tarjetas de especialidad y médico, fecha y horario. */
async function completarDatos(usuario: ReturnType<typeof userEvent.setup>, fecha: string, hora: string) {
  await usuario.click(await screen.findByRole('radio', { name: /Cardiología/ }))
  await usuario.click(await screen.findByRole('radio', { name: /Gómez, Laura/ }))
  await usuario.type(screen.getByLabelText('Otra fecha'), fecha)
  await usuario.click(await screen.findByRole('radio', { name: hora }))
}

describe('Pedir turno (paciente) en dos pasos', () => {
  it('Siguiente muestra el resumen y Confirmar turno lo envía a nombre del propio paciente', async () => {
    const fecha = proximoMartes()
    const fetchFalso = simularFetch([
      ...rutasBase(),
      { metodo: 'POST', url: '/api/turnos', estado: 201, cuerpo: { id: 55 } },
    ])
    const usuario = userEvent.setup()
    renderizarEn('/turnos/nuevo', '/turnos/nuevo', <FormularioTurno />, sesionDePrueba('PACIENTE', 7))

    expect(await screen.findByText('Ana Torres')).toBeInTheDocument() // el resumen muestra al propio paciente
    expect(screen.queryByLabelText('Paciente')).not.toBeInTheDocument() // no puede elegir otro paciente

    await completarDatos(usuario, fecha, '10:30')
    expect(screen.getByText('10:30 a 11:00 hs')).toBeInTheDocument() // resumen en vivo
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))

    // Paso 2: comprobante, todavía sin enviar nada
    const resumen = await screen.findByRole('region', { name: 'Revisá tu turno' })
    expect(within(resumen).getByText('Cardiología')).toBeInTheDocument()
    expect(within(resumen).getByText('Laura Gómez')).toBeInTheDocument()
    expect(within(resumen).getByText('10:30 hs · 30 minutos')).toBeInTheDocument()
    expect(fetchFalso.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)

    await usuario.click(within(resumen).getByRole('button', { name: 'Confirmar turno' }))

    expect(await screen.findByText('Otra página')).toBeInTheDocument()
    const envio = fetchFalso.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(envio?.[1]?.body))).toMatchObject({
      pacienteId: 7, especialidadId: 3, medicoId: 1, fechaHora: `${fecha}T10:30`, duracionMinutos: 30,
    })
  })

  it('no avanza al resumen si faltan datos', async () => {
    simularFetch(rutasBase())
    const usuario = userEvent.setup()
    renderizarEn('/turnos/nuevo', '/turnos/nuevo', <FormularioTurno />, sesionDePrueba('PACIENTE', 7))

    await usuario.click(await screen.findByRole('button', { name: 'Siguiente' }))

    expect(screen.getByText('Seleccioná una especialidad', { selector: '.error-campo' })).toBeInTheDocument()
    expect(screen.getByText('Seleccioná un médico', { selector: '.error-campo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar turno' })).not.toBeInTheDocument()
  })

  it('si el servidor rechaza el turno muestra el motivo y permite volver', async () => {
    simularFetch([
      ...rutasBase(),
      { metodo: 'POST', url: '/api/turnos', estado: 409, cuerpo: { detail: 'El médico ya tiene un turno programado de 10:00 a 10:30 que se superpone con el horario elegido' } },
    ])
    const usuario = userEvent.setup()
    renderizarEn('/turnos/nuevo', '/turnos/nuevo', <FormularioTurno />, sesionDePrueba('PACIENTE', 7))

    await completarDatos(usuario, proximoMartes(), '10:15')
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.click(await screen.findByRole('button', { name: 'Confirmar turno' }))

    expect(await screen.findByText(/se superpone con el horario elegido/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument()
  })
})

describe('Nuevo turno (personal)', () => {
  it('muestra deshabilitados los horarios ya ocupados del médico', async () => {
    const fecha = proximoMartes()
    simularFetch(rutasBase([
      { id: 9, pacienteId: 8, medicoId: 1, especialidadId: 3, fechaHora: `${fecha}T10:00:00`, fechaHoraFin: `${fecha}T10:30:00`, duracionMinutos: 30, estado: 'PROGRAMADO', motivo: null, creadoEn: `${fecha}T08:00:00` },
    ]))
    const usuario = userEvent.setup()
    renderizarEn('/turnos/nuevo', '/turnos/nuevo', <FormularioTurno />, sesionDePrueba('ADMINISTRATIVO'))

    expect(await screen.findByLabelText(/^Paciente/)).toBeInTheDocument() // el personal elige el paciente
    await usuario.click(await screen.findByRole('radio', { name: /Cardiología/ }))
    await usuario.click(await screen.findByRole('radio', { name: /Gómez, Laura/ }))
    await usuario.type(screen.getByLabelText('Otra fecha'), fecha)

    expect(await screen.findByRole('radio', { name: '10:00' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '10:15' })).toBeDisabled() // 10:15-10:45 se superpone
    expect(screen.getByRole('radio', { name: '09:30' })).toBeEnabled() // 09:30-10:00 termina justo antes
    expect(screen.getByRole('radio', { name: '10:30' })).toBeEnabled()
  })
})
