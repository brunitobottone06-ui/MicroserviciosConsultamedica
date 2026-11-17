import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { ProveedorNotificaciones } from '../componentes/Notificaciones'
import type { Rol, Sesion } from '../sesion/almacen'
import { ProveedorSesion } from '../sesion/Sesion'

export interface RutaSimulada {
  metodo?: string
  /** Texto que debe contener la URL, o expresión regular. */
  url: string | RegExp
  estado?: number
  cuerpo?: unknown
  /** Simula que el servidor no responde (error de red). */
  sinConexion?: boolean
}

/**
 * Reemplaza fetch por una versión falsa que responde según las rutas indicadas.
 * Devuelve el mock para poder inspeccionar las llamadas realizadas.
 */
export function simularFetch(rutas: RutaSimulada[]) {
  const mock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada)
    const metodo = (init?.method ?? 'GET').toUpperCase()
    const ruta = rutas.find((r) => (r.metodo ?? 'GET') === metodo
      && (typeof r.url === 'string' ? url.includes(r.url) : r.url.test(url)))
    if (!ruta) throw new Error(`Ruta no simulada: ${metodo} ${url}`)
    if (ruta.sinConexion) throw new TypeError('Failed to fetch')
    const estado = ruta.estado ?? 200
    if (estado === 204) return new Response(null, { status: 204 })
    const cuerpo = typeof ruta.cuerpo === 'string' ? ruta.cuerpo : JSON.stringify(ruta.cuerpo ?? {})
    return new Response(cuerpo, { status: estado, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

/** Sesión de prueba (el token no se verifica en el frontend). */
export function sesionDePrueba(rol: Rol = 'ADMINISTRATIVO', pacienteId: number | null = null): Sesion {
  return {
    token: `token-${rol.toLowerCase()}`,
    expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
    usuario: { id: 1, usuario: rol === 'PACIENTE' ? '30111222' : 'admin', nombre: rol === 'PACIENTE' ? 'Ana Torres' : 'Administración', rol, pacienteId, activo: true },
  }
}

/** Renderiza una página dentro de un router en memoria, en la ruta indicada y con una sesión iniciada. */
export function renderizarEn(ruta: string, patron: string, elemento: ReactElement, sesion: Sesion | null = sesionDePrueba()) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorSesion inicial={sesion}>
        <ProveedorNotificaciones>
          <Routes>
            <Route path={patron} element={elemento} />
            <Route path="/login" element={<p>Pantalla de inicio de sesión</p>} />
            <Route path="*" element={<p>Otra página</p>} />
          </Routes>
        </ProveedorNotificaciones>
      </ProveedorSesion>
    </MemoryRouter>,
  )
}
