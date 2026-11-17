import { describe, expect, it, vi } from 'vitest'
import { simularFetch } from '../test/utilidades'
import { ErrorApi, consulta, servicioDeRuta, solicitar } from './cliente'

async function capturar(promesa: Promise<unknown>): Promise<ErrorApi> {
  try {
    await promesa
  } catch (e) {
    if (e instanceof ErrorApi) return e
    throw e
  }
  throw new Error('Se esperaba un error')
}

describe('cliente HTTP', () => {
  it('devuelve el JSON cuando la respuesta es exitosa', async () => {
    simularFetch([{ url: '/api/pacientes', cuerpo: [{ id: 1 }] }])
    await expect(solicitar('/api/pacientes')).resolves.toEqual([{ id: 1 }])
  })

  it('convierte un 400 en error de validación con los errores por campo', async () => {
    simularFetch([{ metodo: 'POST', url: '/api/pacientes', estado: 400, cuerpo: { detail: 'Datos inválidos', errores: { dni: 'DNI inválido' } } }])
    const error = await capturar(solicitar('/api/pacientes', { metodo: 'POST', cuerpo: {} }))
    expect(error.tipo).toBe('validacion')
    expect(error.errores).toEqual({ dni: 'DNI inválido' })
  })

  it('convierte 409 y 422 en errores de negocio con el mensaje del backend', async () => {
    simularFetch([{ metodo: 'POST', url: '/api/turnos', estado: 409, cuerpo: { detail: 'El médico ya tiene un turno' } }])
    const error = await capturar(solicitar('/api/turnos', { metodo: 'POST', cuerpo: {} }))
    expect(error.tipo).toBe('negocio')
    expect(error.message).toBe('El médico ya tiene un turno')
  })

  it('un 503 del backend indica qué servicio no está disponible', async () => {
    simularFetch([{ metodo: 'POST', url: '/api/turnos', estado: 503, cuerpo: { detail: 'El servicio de pacientes no está disponible', servicio: 'pacientes' } }])
    const error = await capturar(solicitar('/api/turnos', { metodo: 'POST', cuerpo: {} }))
    expect(error.tipo).toBe('no-disponible')
    expect(error.servicio).toBe('pacientes')
    expect(error.message).toContain('pacientes')
  })

  it('un 502 del proxy (servicio apagado, respuesta HTML) también se informa como no disponible', async () => {
    simularFetch([{ url: '/api/medicos', estado: 502, cuerpo: '<html>Bad Gateway</html>' }])
    const error = await capturar(solicitar('/api/medicos'))
    expect(error.tipo).toBe('no-disponible')
    expect(error.message).toBe('El servicio de médicos no está disponible en este momento. Intentá nuevamente en unos minutos.')
  })

  it('sin conexión con el servidor devuelve un error de red comprensible', async () => {
    simularFetch([{ url: '/api/especialidades', sinConexion: true }])
    const error = await capturar(solicitar('/api/especialidades'))
    expect(error.tipo).toBe('red')
    expect(error.message).toContain('No se pudo conectar')
  })

  it('corta la espera cuando se supera el tiempo máximo', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_, rechazar) => {
      init.signal?.addEventListener('abort', () => rechazar(new DOMException('Abortado', 'AbortError')))
    })))
    const error = await capturar(solicitar('/api/turnos', { timeoutMs: 20 }))
    expect(error.tipo).toBe('tiempo')
  })

  it('arma query strings ignorando valores vacíos', () => {
    expect(consulta({ buscar: 'ana', pacienteId: 3, vacio: '', nada: undefined })).toBe('?buscar=ana&pacienteId=3')
    expect(consulta({})).toBe('')
  })

  it('reconoce el servicio a partir de la ruta', () => {
    expect(servicioDeRuta('/api/medicos/3?x=1')).toBe('médicos')
    expect(servicioDeRuta('/estado/turnos')).toBe('turnos')
  })
})
