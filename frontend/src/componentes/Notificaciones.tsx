import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icono } from './Icono'

type TipoNotificacion = 'exito' | 'error' | 'info'

interface Notificacion {
  id: number
  texto: string
  tipo: TipoNotificacion
}

const Contexto = createContext<(texto: string, tipo?: TipoNotificacion) => void>(() => {})

/** Mensajes breves de resultado ("Paciente guardado") que desaparecen solos o se cierran a mano. */
export function ProveedorNotificaciones({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Notificacion[]>([])

  const quitar = useCallback((id: number) => setLista((actual) => actual.filter((n) => n.id !== id)), [])

  const notificar = useCallback((texto: string, tipo: TipoNotificacion = 'exito') => {
    const id = Date.now() + Math.random()
    setLista((actual) => [...actual, { id, texto, tipo }])
    setTimeout(() => quitar(id), tipo === 'error' ? 7000 : 4500)
  }, [quitar])

  return (
    <Contexto.Provider value={notificar}>
      {children}
      <div className="notificaciones" aria-live="polite">
        {lista.map((n) => (
          <div key={n.id} className={`notificacion notificacion-${n.tipo}`} role={n.tipo === 'error' ? 'alert' : 'status'}>
            <Icono nombre={n.tipo === 'exito' ? 'check' : n.tipo === 'error' ? 'alerta' : 'info'} />
            <p>{n.texto}</p>
            <button type="button" aria-label="Cerrar aviso" onClick={() => quitar(n.id)}><Icono nombre="cerrar" tamano={16} /></button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

export function useNotificar() {
  return useContext(Contexto)
}
