import type { ReactNode } from 'react'
import { ErrorApi, mensajeDeError } from '../api/cliente'
import type { Carga } from '../hooks/useCarga'
import { Icono, type NombreIcono } from './Icono'

/** Indicador de carga: texto accesible + líneas "esqueleto" que anticipan el contenido. */
export function Cargando({ texto = 'Cargando...', lineas = 3 }: { texto?: string; lineas?: number }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="cargando-texto"><span className="spinner" aria-hidden="true" />{texto}</span>
      {lineas > 0 && (
        <div className="esqueleto" aria-hidden="true">
          {Array.from({ length: lineas }, (_, i) => <span key={i} />)}
        </div>
      )}
    </div>
  )
}

function esNoDisponible(error: unknown) {
  return error instanceof ErrorApi && ['no-disponible', 'red', 'tiempo'].includes(error.tipo)
}

/** Muestra un error de forma clara, distinguiendo "servicio no disponible" de otros problemas. */
export function MensajeError({ error, alReintentar }: { error: unknown; alReintentar?: () => void }) {
  const noDisponible = esNoDisponible(error)
  const sinPermiso = error instanceof ErrorApi && error.tipo === 'prohibido'
  const titulo = noDisponible ? 'Servicio no disponible' : sinPermiso ? 'Sin permiso' : 'No se pudo completar la operación'
  return (
    <div className={`alerta ${noDisponible ? 'alerta-advertencia' : 'alerta-error'}`} role="alert">
      <Icono nombre={noDisponible ? 'servidor' : 'alerta'} />
      <div className="alerta-cuerpo">
        <strong>{titulo}</strong>
        <p>{mensajeDeError(error)}</p>
        {noDisponible && <p className="texto-tenue">El resto del sistema sigue funcionando. Podés reintentar en unos instantes.</p>}
        {alReintentar && (
          <button type="button" className="boton boton-secundario boton-chico" onClick={alReintentar}>
            <Icono nombre="refrescar" tamano={16} />Reintentar
          </button>
        )}
      </div>
    </div>
  )
}

/** Estado vacío con ícono, explicación y, opcionalmente, una acción para salir de él. */
export function Vacio({ children, titulo, icono = 'info', accion }: {
  children?: ReactNode
  titulo?: string
  icono?: NombreIcono
  accion?: ReactNode
}) {
  return (
    <div className="vacio">
      <span className="vacio-icono"><Icono nombre={icono} tamano={26} /></span>
      {titulo && <strong>{titulo}</strong>}
      {children && <p>{children}</p>}
      {accion}
    </div>
  )
}

/** Envuelve una carga: muestra el indicador, el error con "Reintentar", o el contenido. */
export function Recurso<T>({ carga, children, textoCargando, lineas }: {
  carga: Carga<T>
  children: (datos: T) => ReactNode
  textoCargando?: string
  lineas?: number
}) {
  if (carga.cargando && carga.datos === undefined) return <Cargando texto={textoCargando} lineas={lineas} />
  if (carga.error) return <MensajeError error={carga.error} alReintentar={carga.recargar} />
  if (carga.datos === undefined) return null
  return <>{children(carga.datos)}</>
}

export function Avisos({ avisos }: { avisos: string[] }) {
  if (avisos.length === 0) return null
  return (
    <div className="alerta alerta-advertencia" role="status">
      <Icono nombre="alerta" />
      <div className="alerta-cuerpo">{avisos.map((a) => <p key={a}>{a}</p>)}</div>
    </div>
  )
}

export function Alerta({ tipo = 'info', titulo, children, icono }: {
  tipo?: 'info' | 'exito' | 'advertencia' | 'error'
  titulo?: string
  children?: ReactNode
  icono?: NombreIcono
}) {
  const porDefecto: Record<string, NombreIcono> = { info: 'info', exito: 'check', advertencia: 'alerta', error: 'alerta' }
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'error' ? 'alert' : 'note'}>
      <Icono nombre={icono ?? porDefecto[tipo]} />
      <div className="alerta-cuerpo">
        {titulo && <strong>{titulo}</strong>}
        {children}
      </div>
    </div>
  )
}
