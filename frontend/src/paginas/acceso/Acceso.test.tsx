import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RutaProtegida } from '../../sesion/Sesion'
import { renderizarEn, sesionDePrueba, simularFetch } from '../../test/utilidades'
import { ListaPacientes } from '../pacientes/ListaPacientes'
import { IniciarSesion } from './IniciarSesion'

describe('Iniciar sesión', () => {
  it('ingresa con usuario y contraseña y guarda la sesión', async () => {
    const fetchFalso = simularFetch([{ metodo: 'POST', url: '/api/auth/login', cuerpo: sesionDePrueba('PACIENTE', 7) }])
    const usuario = userEvent.setup()
    renderizarEn('/login', '/login', <IniciarSesion />, null)

    await usuario.type(screen.getByLabelText('Usuario'), '30111222')
    await usuario.type(screen.getByLabelText('Contraseña'), 'clave-segura-1')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Otra página')).toBeInTheDocument()
    expect(JSON.parse(String(fetchFalso.mock.calls[0][1]?.body))).toEqual({ usuario: '30111222', clave: 'clave-segura-1' })
    expect(sessionStorage.getItem('consultorio.sesion')).toContain('token-paciente')
  })

  it('muestra el error si la contraseña es incorrecta', async () => {
    simularFetch([{ metodo: 'POST', url: '/api/auth/login', estado: 401, cuerpo: { detail: 'Usuario o contraseña incorrectos.' } }])
    const usuario = userEvent.setup()
    renderizarEn('/login', '/login', <IniciarSesion />, null)

    await usuario.type(screen.getByLabelText('Usuario'), 'admin')
    await usuario.type(screen.getByLabelText('Contraseña'), 'mala')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument()
  })

  it('valida que se completen los campos sin llamar al servidor', async () => {
    const fetchFalso = simularFetch([])
    const usuario = userEvent.setup()
    renderizarEn('/login', '/login', <IniciarSesion />, null)

    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(screen.getByText('Ingresá tu usuario')).toBeInTheDocument()
    expect(fetchFalso).not.toHaveBeenCalled()
  })
})

describe('Rutas protegidas', () => {
  it('sin sesión lleva a la pantalla de inicio de sesión', () => {
    simularFetch([])
    renderizarEn('/pacientes', '/pacientes', <RutaProtegida><ListaPacientes /></RutaProtegida>, null)
    expect(screen.getByText('Pantalla de inicio de sesión')).toBeInTheDocument()
  })

  it('un rol sin permiso ve un aviso en lugar de la sección', () => {
    simularFetch([])
    renderizarEn('/pacientes', '/pacientes',
      <RutaProtegida roles={['ADMINISTRATIVO', 'MEDICO']}><ListaPacientes /></RutaProtegida>, sesionDePrueba('PACIENTE', 7))
    expect(screen.getByText('Tu usuario no tiene acceso a esta sección.')).toBeInTheDocument()
  })

  it('envía el token en cada pedido y, si el backend responde 401, cierra la sesión', async () => {
    const fetchFalso = simularFetch([{ url: '/api/pacientes', estado: 401, cuerpo: { detail: 'Tu sesión no es válida o expiró.' } }])
    renderizarEn('/pacientes', '/pacientes', <RutaProtegida><ListaPacientes /></RutaProtegida>)

    expect(await screen.findByText('Pantalla de inicio de sesión')).toBeInTheDocument()
    const encabezados = fetchFalso.mock.calls[0][1]?.headers as Record<string, string>
    expect(encabezados.Authorization).toBe('Bearer token-administrativo')
  })
})
