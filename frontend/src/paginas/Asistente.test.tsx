import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderizarEn, simularFetch } from '../test/utilidades'
import { Asistente } from './Asistente'

const DISPONIBLE = { habilitado: true, disponible: true, modelo: 'llama3.2:3b', motivo: null }

describe('Asistente', () => {
  it('explica por qué no está disponible cuando Ollama no responde', async () => {
    simularFetch([{
      url: '/api/asistente/estado',
      cuerpo: { habilitado: true, disponible: false, modelo: 'llama3.2:3b', motivo: 'No se pudo conectar con Ollama en http://ollama:11434.' },
    }])
    renderizarEn('/asistente', '/asistente', <Asistente />)

    expect(await screen.findByText('El asistente no está disponible')).toBeInTheDocument()
    expect(screen.getByText(/No se pudo conectar con Ollama/)).toBeInTheDocument()
    expect(screen.getByText(/funcionan normalmente sin él/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Tu pregunta' })).toBeDisabled()
  })

  it('informa si el servicio de consultas (que contiene al asistente) está caído', async () => {
    simularFetch([{ url: '/api/asistente/estado', estado: 502, cuerpo: '' }])
    renderizarEn('/asistente', '/asistente', <Asistente />)

    expect(await screen.findByText('El asistente no está disponible')).toBeInTheDocument()
    expect(screen.getByText(/El resto del sistema sigue funcionando/)).toBeInTheDocument()
  })

  it('envía la pregunta con el historial y muestra la respuesta', async () => {
    const fetchFalso = simularFetch([
      { url: '/api/asistente/estado', cuerpo: DISPONIBLE },
      { metodo: 'POST', url: '/api/asistente/chat', cuerpo: { respuesta: 'Atendemos de lunes a viernes de 8 a 20.', origen: 'MODELO', datosPersonalesOcultados: false } },
    ])
    const usuario = userEvent.setup()
    renderizarEn('/asistente', '/asistente', <Asistente />)

    const entrada = await screen.findByRole('textbox', { name: 'Tu pregunta' })
    await waitFor(() => expect(entrada).toBeEnabled())
    await usuario.type(entrada, '¿Qué horario tienen?{Enter}')

    expect(await screen.findByText('Atendemos de lunes a viernes de 8 a 20.')).toBeInTheDocument()
    expect(screen.getByText('¿Qué horario tienen?')).toBeInTheDocument()
    const llamada = fetchFalso.mock.calls.find(([url]) => String(url).includes('/chat'))
    expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({ mensaje: '¿Qué horario tienen?', historial: [] })
  })

  it('identifica las respuestas automáticas de seguridad', async () => {
    simularFetch([
      { url: '/api/asistente/estado', cuerpo: DISPONIBLE },
      { metodo: 'POST', url: '/api/asistente/chat', cuerpo: { respuesta: 'No puedo ayudarte con síntomas...', origen: 'REGLA_SEGURIDAD', datosPersonalesOcultados: true } },
    ])
    const usuario = userEvent.setup()
    renderizarEn('/asistente', '/asistente', <Asistente />)

    await usuario.click(await screen.findByRole('button', { name: '¿Cómo pido un turno?' }))

    expect(await screen.findByText(/Respuesta automática de seguridad/)).toBeInTheDocument()
    expect(screen.getByText(/se ocultaron datos personales/)).toBeInTheDocument()
  })

  it('muestra el motivo si el modelo falla al responder', async () => {
    simularFetch([
      { url: '/api/asistente/estado', cuerpo: DISPONIBLE },
      { metodo: 'POST', url: '/api/asistente/chat', estado: 503, cuerpo: { detail: "El modelo 'llama3.2:3b' no está descargado en Ollama.", servicio: 'asistente' } },
    ])
    const usuario = userEvent.setup()
    renderizarEn('/asistente', '/asistente', <Asistente />)

    await usuario.click(await screen.findByRole('button', { name: '¿Cuál es el horario de atención?' }))

    expect(await screen.findByText(/no está descargado en Ollama/)).toBeInTheDocument()
  })
})
