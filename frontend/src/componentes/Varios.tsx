import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { EstadoTurno } from '../api/tipos'
import { TEXTO_ESTADO_TURNO } from '../utilidades/formato'
import { Icono, type NombreIcono } from './Icono'

export function Insignia({ tipo, children, sinPunto = false }: {
  tipo: 'exito' | 'alerta' | 'aviso' | 'neutro' | 'info' | 'marca'
  children: ReactNode
  sinPunto?: boolean
}) {
  return <span className={`insignia insignia-${tipo} ${sinPunto ? 'sin-punto' : ''}`}>{children}</span>
}

export function InsigniaActivo({ activo, femenino = false }: { activo: boolean; femenino?: boolean }) {
  return activo
    ? <Insignia tipo="exito">{femenino ? 'Activa' : 'Activo'}</Insignia>
    : <Insignia tipo="neutro">{femenino ? 'Dada de baja' : 'Dado de baja'}</Insignia>
}

export function InsigniaTurno({ estado }: { estado: EstadoTurno }) {
  const tipo = estado === 'PROGRAMADO' ? 'info' : estado === 'ATENDIDO' ? 'exito' : 'alerta'
  return <Insignia tipo={tipo}>{TEXTO_ESTADO_TURNO[estado]}</Insignia>
}

/** Círculo con iniciales; el color se deriva del nombre para que cada persona sea reconocible. */
export function Avatar({ nombre, tamano = 'normal' }: { nombre: string; tamano?: 'chico' | 'normal' | 'grande' }) {
  const partes = nombre.replace(',', ' ').split(/\s+/).filter(Boolean)
  const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
  const tono = [...nombre].reduce((suma, c) => suma + c.charCodeAt(0), 0) % 6
  return <span className={`avatar avatar-t${tono} ${tamano !== 'normal' ? `avatar-${tamano}` : ''}`} aria-hidden="true">{iniciales}</span>
}

/** Avatar + nombre + dato secundario, opcionalmente con enlace. */
export function Persona({ nombre, detalle, a, tamano }: { nombre: string; detalle?: ReactNode; a?: string; tamano?: 'chico' | 'normal' }) {
  return (
    <span className="persona">
      <Avatar nombre={nombre} tamano={tamano} />
      <div>
        <strong>{a ? <Link to={a}>{nombre}</Link> : nombre}</strong>
        {detalle && <small>{detalle}</small>}
      </div>
    </span>
  )
}

/**
 * Botón de acción con confirmación en dos pasos (sin ventanas emergentes del navegador).
 * Primer clic: muestra la pregunta; "Sí, confirmar" ejecuta la acción.
 */
export function BotonConfirmar({ texto, pregunta, alConfirmar, peligroso = false, deshabilitado = false, icono }: {
  texto: string
  pregunta: string
  alConfirmar: () => Promise<void> | void
  peligroso?: boolean
  deshabilitado?: boolean
  icono?: NombreIcono
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [trabajando, setTrabajando] = useState(false)

  if (!confirmando) {
    return (
      <button type="button" className={`boton ${peligroso ? 'boton-peligro' : 'boton-secundario'}`}
        disabled={deshabilitado} onClick={() => setConfirmando(true)}>
        {icono && <Icono nombre={icono} tamano={18} />}
        {texto}
      </button>
    )
  }
  return (
    <span className="confirmacion" role="group" aria-label={pregunta}>
      <span>{pregunta}</span>
      <button type="button" className={`boton boton-chico ${peligroso ? 'boton-peligro-lleno' : 'boton-primario'}`}
        disabled={trabajando}
        onClick={async () => {
          setTrabajando(true)
          try {
            await alConfirmar()
          } finally {
            setTrabajando(false)
            setConfirmando(false)
          }
        }}>
        {trabajando ? 'Procesando...' : 'Sí, confirmar'}
      </button>
      <button type="button" className="boton boton-chico boton-secundario" disabled={trabajando}
        onClick={() => setConfirmando(false)}>
        No
      </button>
    </span>
  )
}

export function EncabezadoPagina({ titulo, descripcion, acciones, icono, migas }: {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
  icono?: NombreIcono
  migas?: { texto: string; a: string }[]
}) {
  return (
    <header className="encabezado">
      <div>
        {migas && (
          <nav className="migas" aria-label="Ubicación">
            {migas.map((m) => (
              <span key={m.a}>
                <Link to={m.a}>{m.texto}</Link><Icono nombre="derecha" tamano={14} />
              </span>
            ))}
          </nav>
        )}
        <div className="encabezado-texto">
          {icono && <span className="encabezado-icono"><Icono nombre={icono} tamano={24} /></span>}
          <div>
            <h1>{titulo}</h1>
            {descripcion && <p>{descripcion}</p>}
          </div>
        </div>
      </div>
      {acciones && <div className="acciones">{acciones}</div>}
    </header>
  )
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="dato">
      <dt>{etiqueta}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

/** Tarjeta de métrica del panel. Si recibe "a", toda la tarjeta es un enlace. */
export function Metrica({ icono, etiqueta, valor, detalle, a, tono = 'primario' }: {
  icono: NombreIcono
  etiqueta: string
  valor: ReactNode
  detalle?: ReactNode
  a?: string
  tono?: 'primario' | 'acento' | 'info' | 'exito'
}) {
  const contenido = (
    <>
      <span className="metrica-icono"><Icono nombre={icono} /></span>
      <span className="metrica-etiqueta">{etiqueta}</span>
      <span className="metrica-valor">{valor}</span>
      {detalle && <span className="metrica-detalle">{detalle}</span>}
    </>
  )
  return a
    ? <Link to={a} className={`metrica tono-${tono}`}>{contenido}</Link>
    : <div className={`metrica tono-${tono}`}>{contenido}</div>
}

/** Selector de opciones excluyentes con aspecto de botones (accesible como radiogroup). */
export function Segmentado<T extends string>({ etiqueta, opciones, valor, alCambiar }: {
  etiqueta: string
  opciones: { valor: T; texto: string }[]
  valor: T
  alCambiar: (valor: T) => void
}) {
  return (
    <div className="grupo-filtro">
      <span id={`seg-${etiqueta}`}>{etiqueta}</span>
      <div className="segmentado" role="radiogroup" aria-labelledby={`seg-${etiqueta}`}>
        {opciones.map((o) => (
          <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} onClick={() => alCambiar(o.valor)}>
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Campo de búsqueda con ícono. */
export function Buscador({ id, etiqueta, valor, alCambiar, placeholder }: {
  id: string
  etiqueta: string
  valor: string
  alCambiar: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="campo campo-busqueda">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="buscador">
        <Icono nombre="buscar" tamano={18} />
        <input id={id} type="search" value={valor} placeholder={placeholder} onChange={(e) => alCambiar(e.target.value)} />
      </div>
    </div>
  )
}
