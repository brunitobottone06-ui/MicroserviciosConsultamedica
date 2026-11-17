import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizarEn, simularFetch } from '../../test/utilidades'
import { FormularioPaciente } from './FormularioPaciente'
import { ListaPacientes } from './ListaPacientes'

const ANA = {
  id: 1, nombre: 'Ana', apellido: 'Torres', dni: '30111222', fechaNacimiento: '1983-04-12',
  email: null, telefono: '011 5000-0001', obraSocial: 'OSDE', activo: true,
}

describe('Listado de pacientes', () => {
  it('muestra un indicador de carga y luego los pacientes', async () => {
    simularFetch([{ url: '/api/pacientes', cuerpo: [ANA] }])
    renderizarEn('/pacientes', '/pacientes', <ListaPacientes />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando pacientes...')
    expect(await screen.findByRole('link', { name: 'Torres, Ana' })).toBeInTheDocument()
    expect(screen.getByText('OSDE')).toBeInTheDocument()
  })

  it('si el servicio no está disponible lo explica y permite reintentar', async () => {
    const fetchFalso = simularFetch([{ url: '/api/pacientes', estado: 502, cuerpo: '' }])
    const usuario = userEvent.setup()
    renderizarEn('/pacientes', '/pacientes', <ListaPacientes />)

    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
    expect(screen.getByText(/El servicio de pacientes no está disponible/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })

  it('busca por texto', async () => {
    const fetchFalso = simularFetch([{ url: '/api/pacientes', cuerpo: [] }])
    const usuario = userEvent.setup()
    renderizarEn('/pacientes', '/pacientes', <ListaPacientes />)

    await usuario.type(screen.getByLabelText('Buscar por nombre, apellido o DNI'), 'torres')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('No hay pacientes que coincidan con "torres".')).toBeInTheDocument()
    expect(String(fetchFalso.mock.calls.at(-1)?.[0])).toContain('buscar=torres')
  })
})

describe('Formulario de paciente', () => {
  it('valida en el navegador antes de enviar y no llama a la API', async () => {
    const fetchFalso = simularFetch([])
    const usuario = userEvent.setup()
    renderizarEn('/pacientes/nuevo', '/pacientes/nuevo', <FormularioPaciente />)

    await usuario.type(screen.getByLabelText(/DNI/), '30.111')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El DNI debe tener 7 u 8 dígitos, sin puntos')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute('aria-invalid', 'true')
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('muestra los errores que devuelve el backend (por ejemplo, DNI duplicado)', async () => {
    simularFetch([{ metodo: 'POST', url: '/api/pacientes', estado: 409, cuerpo: { detail: 'Ya existe un paciente con el DNI 30111222' } }])
    const usuario = userEvent.setup()
    renderizarEn('/pacientes/nuevo', '/pacientes/nuevo', <FormularioPaciente />)

    await usuario.type(screen.getByLabelText(/Nombre/), 'Ana')
    await usuario.type(screen.getByLabelText(/Apellido/), 'Torres')
    await usuario.type(screen.getByLabelText(/DNI/), '30111222')
    await usuario.type(screen.getByLabelText(/Fecha de nacimiento/), '1990-05-20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe un paciente con el DNI 30111222')).toBeInTheDocument()
  })

  it('al guardar correctamente envía los opcionales vacíos como null y navega al detalle', async () => {
    const fetchFalso = simularFetch([{ metodo: 'POST', url: '/api/pacientes', estado: 201, cuerpo: { ...ANA, id: 7 } }])
    const usuario = userEvent.setup()
    renderizarEn('/pacientes/nuevo', '/pacientes/nuevo', <FormularioPaciente />)

    await usuario.type(screen.getByLabelText(/Nombre/), 'Ana')
    await usuario.type(screen.getByLabelText(/Apellido/), 'Torres')
    await usuario.type(screen.getByLabelText(/DNI/), '30111222')
    await usuario.type(screen.getByLabelText(/Fecha de nacimiento/), '1990-05-20')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Otra página')).toBeInTheDocument()
    const cuerpo = JSON.parse(String(fetchFalso.mock.calls[0][1]?.body))
    expect(cuerpo).toMatchObject({ nombre: 'Ana', dni: '30111222', email: null, obraSocial: null })
  })
})
