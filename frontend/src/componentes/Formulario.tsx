import { useId, useState, type ReactNode } from 'react'
import { ErrorApi, mensajeDeError } from '../api/cliente'
import { Icono } from './Icono'

interface PropsCampo {
  etiqueta: string
  error?: string
  ayuda?: ReactNode
  obligatorio?: boolean
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

/** Etiqueta + control + mensaje de error accesible (el lector de pantalla lo asocia al campo). */
export function Campo({ etiqueta, error, ayuda, obligatorio, children }: PropsCampo) {
  const id = useId()
  const idError = `${id}-error`
  const idAyuda = `${id}-ayuda`
  const descritoPor = [error ? idError : null, ayuda && !error ? idAyuda : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={`campo ${error ? 'campo-con-error' : ''}`}>
      <label htmlFor={id}>
        {etiqueta}
        {obligatorio && <span className="obligatorio" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': descritoPor })}
      {ayuda && !error && <small id={idAyuda} className="ayuda">{ayuda}</small>}
      {error && <small id={idError} className="error-campo"><Icono nombre="alerta" tamano={14} />{error}</small>}
    </div>
  )
}

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function CampoClave({ etiqueta, valor, alCambiar, error, ayuda, obligatorio, autoComplete }: {
  etiqueta: string
  valor: string
  alCambiar: (v: string) => void
  error?: string
  ayuda?: ReactNode
  obligatorio?: boolean
  autoComplete: 'current-password' | 'new-password'
}) {
  const [visible, setVisible] = useState(false)
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} obligatorio={obligatorio}>
      {(p) => (
        <div className="campo-clave">
          <input {...p} type={visible ? 'text' : 'password'} value={valor} autoComplete={autoComplete}
            onChange={(e) => alCambiar(e.target.value)} />
          <button type="button" className="boton boton-fantasma boton-icono" onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
            <Icono nombre={visible ? 'ojoTachado' : 'ver'} tamano={18} />
          </button>
        </div>
      )}
    </Campo>
  )
}

/** Bloque de formulario con título (y número de paso, si corresponde). */
export function SeccionFormulario({ titulo, descripcion, numero, children, deshabilitada = false, id }: {
  titulo: string
  descripcion?: ReactNode
  numero?: number
  children: ReactNode
  deshabilitada?: boolean
  id?: string
}) {
  return (
    <section className={`seccion-formulario ${deshabilitada ? 'deshabilitada' : ''}`} aria-labelledby={id}>
      <header>
        {numero !== undefined && <span className="seccion-numero" aria-hidden="true">{numero}</span>}
        <div>
          <h2 id={id}>{titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

/** Error general de un formulario (el backend rechazó la operación o el servicio no respondió). */
export function ErrorFormulario({ error, titulo = 'No se pudo guardar' }: { error: unknown; titulo?: string }) {
  if (!error) return null
  const noDisponible = error instanceof ErrorApi && ['no-disponible', 'red', 'tiempo'].includes(error.tipo)
  return (
    <div className={`alerta ${noDisponible ? 'alerta-advertencia' : 'alerta-error'}`} role="alert">
      <Icono nombre={noDisponible ? 'servidor' : 'alerta'} />
      <div className="alerta-cuerpo">
        <strong>{noDisponible ? 'Servicio no disponible' : titulo}</strong>
        <p>{mensajeDeError(error)}</p>
      </div>
    </div>
  )
}

/** Toma los errores por campo que devolvió el backend (HTTP 400) para mostrarlos junto a cada campo. */
export function erroresDelServidor(error: unknown): Record<string, string> {
  return error instanceof ErrorApi && error.tipo === 'validacion' ? error.errores : {}
}
