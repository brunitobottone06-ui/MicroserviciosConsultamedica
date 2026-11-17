import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ErrorApi, mensajeDeError } from '../api/cliente'
import { asistenteApi } from '../api/servicios'
import type { EstadoAsistente, MensajePrevio, RespuestaAsistente } from '../api/tipos'
import { Icono } from '../componentes/Icono'
import { Avatar, EncabezadoPagina } from '../componentes/Varios'
import { useCarga, type Carga } from '../hooks/useCarga'
import { useSesion } from '../sesion/Sesion'

interface Mensaje {
  id: number
  rol: 'USUARIO' | 'ASISTENTE' | 'ERROR'
  texto: string
  origen?: RespuestaAsistente['origen']
  datosOcultos?: boolean
}

const SUGERENCIAS = [
  '¿Cuál es el horario de atención?',
  '¿Cómo pido un turno?',
  '¿Cómo cancelo un turno?',
  '¿Cómo busco a un paciente en el sistema?',
]

const MAXIMO = 1000

type EstadoConexion = 'verificando' | 'conectado' | 'no-disponible'

function estadoDe(carga: Carga<EstadoAsistente>): EstadoConexion {
  if (carga.cargando) return 'verificando'
  return carga.datos?.disponible ? 'conectado' : 'no-disponible'
}

function Pastilla({ estado }: { estado: EstadoConexion }) {
  const clase = estado === 'conectado' ? 'pastilla-ok' : estado === 'verificando' ? 'pastilla-espera' : 'pastilla-error'
  const texto = estado === 'conectado' ? 'Conectado' : estado === 'verificando' ? 'Verificando…' : 'No disponible'
  return <span className={`pastilla ${clase}`}><span className="punto" aria-hidden="true" />{texto}</span>
}

export function Asistente() {
  const { usuario } = useSesion()
  const estado = useCarga(() => asistenteApi.estado(), [])
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)
  const entradaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [mensajes, enviando])

  const conexion = estadoDe(estado)
  const disponible = conexion === 'conectado'

  const enviar = async (pregunta: string) => {
    const limpia = pregunta.trim()
    if (!limpia || enviando) return
    // El historial vive solo en el navegador: se envían los últimos mensajes como contexto.
    const historial: MensajePrevio[] = mensajes
      .filter((m): m is Mensaje & { rol: 'USUARIO' | 'ASISTENTE' } => m.rol !== 'ERROR')
      .slice(-10)
      .map((m) => ({ rol: m.rol, texto: m.texto }))

    setMensajes((m) => [...m, { id: Date.now(), rol: 'USUARIO', texto: limpia }])
    setTexto('')
    setEnviando(true)
    try {
      const r = await asistenteApi.preguntar(limpia, historial)
      setMensajes((m) => [...m, { id: Date.now() + 1, rol: 'ASISTENTE', texto: r.respuesta, origen: r.origen, datosOcultos: r.datosPersonalesOcultados }])
    } catch (e) {
      setMensajes((m) => [...m, { id: Date.now() + 1, rol: 'ERROR', texto: mensajeDeError(e) }])
      if (e instanceof ErrorApi && e.tipo === 'no-disponible') estado.recargar()
    } finally {
      setEnviando(false)
      entradaRef.current?.focus()
    }
  }

  const alEnviar = (e: FormEvent) => {
    e.preventDefault()
    void enviar(texto)
  }

  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void enviar(texto)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Asistente del consultorio" icono="asistente"
        descripcion="Consultas sobre horarios, turnos y uso del sistema."
        acciones={mensajes.length > 0
          ? <button type="button" className="boton boton-secundario" onClick={() => setMensajes([])}><Icono nombre="refrescar" tamano={18} />Nueva conversación</button>
          : undefined} />

      <AvisoNoDisponible carga={estado} />

      <div className="chat-diseno">
        <section className="tarjeta chat" aria-label="Conversación con el asistente">
          <header className="chat-cabecera">
            <span className="avatar-bot"><Icono nombre="chispa" /></span>
            <div>
              <strong>Asistente virtual</strong>
              <Pastilla estado={conexion} />
            </div>
          </header>

          <div className="mensajes" aria-live="polite">
            {mensajes.length === 0 && (
              <div className="chat-bienvenida">
                <span className="avatar-bot"><Icono nombre="chispa" tamano={26} /></span>
                <h2>¡Hola{usuario ? `, ${usuario.nombre.split(' ')[0]}` : ''}! ¿En qué te ayudo?</h2>
                <p className="texto-suave">Puedo orientarte sobre horarios, cómo pedir o cancelar turnos y cómo usar el sistema.</p>
                <div className="sugerencias">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} type="button" className="sugerencia" disabled={!disponible || enviando} onClick={() => void enviar(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m) => (
              <div key={m.id} className={`mensaje mensaje-${m.rol.toLowerCase()} ${m.origen === 'REGLA_SEGURIDAD' ? 'mensaje-seguridad' : ''}`}>
                {m.rol === 'USUARIO'
                  ? <Avatar nombre={usuario?.nombre ?? 'Vos'} tamano="chico" />
                  : <span className="avatar-bot" style={{ width: 30, height: 30, borderRadius: 10 }}><Icono nombre={m.rol === 'ERROR' ? 'alerta' : 'chispa'} tamano={16} /></span>}
                <div className="burbuja">
                  <span className="solo-lectores">{m.rol === 'USUARIO' ? 'Vos dijiste:' : m.rol === 'ERROR' ? 'Error:' : 'Asistente:'}</span>
                  <p>{m.texto}</p>
                  {m.origen === 'REGLA_SEGURIDAD' && <small><Icono nombre="escudo" tamano={14} />Respuesta automática de seguridad (no se consultó al modelo).</small>}
                  {m.datosOcultos && <small><Icono nombre="candado" tamano={14} />Por privacidad, se ocultaron datos personales de tu mensaje antes de procesarlo.</small>}
                </div>
              </div>
            ))}
            {enviando && (
              <div className="mensaje mensaje-asistente" role="status">
                <span className="avatar-bot" style={{ width: 30, height: 30, borderRadius: 10 }}><Icono nombre="chispa" tamano={16} /></span>
                <div className="burbuja">
                  <span className="escribiendo" aria-hidden="true"><i /><i /><i /></span>
                  <span className="solo-lectores">El asistente está escribiendo</span>
                  <small>Un modelo local puede tardar unos segundos…</small>
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form className="entrada-chat" onSubmit={alEnviar}>
            <label htmlFor="mensaje-asistente" className="solo-lectores">Tu pregunta</label>
            <div className="entrada-fila">
              <textarea id="mensaje-asistente" ref={entradaRef} rows={1} value={texto} maxLength={MAXIMO}
                placeholder={disponible ? 'Escribí tu pregunta y presioná Enter' : 'El asistente no está disponible en este momento'}
                disabled={!disponible || enviando}
                onChange={(e) => setTexto(e.target.value)} onKeyDown={alTeclear} />
              <button type="submit" className="boton boton-primario" disabled={!disponible || enviando || !texto.trim()} aria-label="Enviar">
                <Icono nombre="enviar" tamano={18} /><span>Enviar</span>
              </button>
            </div>
            <div className="entrada-pie">
              <span>Enter para enviar · Shift + Enter para nueva línea</span>
              <span className="numero">{texto.length}/{MAXIMO}</span>
            </div>
          </form>
        </section>

        <aside className="columna">
          <section className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono nombre="servidor" />Conexión</h2><Pastilla estado={conexion} /></div>
            {estado.datos?.disponible && <p className="texto-suave">Modelo local <strong>{estado.datos.modelo}</strong> a través de Ollama.</p>}
            {conexion === 'no-disponible' && <p className="texto-suave">El asistente es opcional: el resto del consultorio funciona sin él.</p>}
            <button type="button" className="boton boton-secundario boton-chico" style={{ marginTop: '0.8rem' }}
              onClick={estado.recargar} disabled={estado.cargando}>
              <Icono nombre="refrescar" tamano={16} />Volver a verificar
            </button>
          </section>
          <section className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono nombre="escudo" />Antes de preguntar</h2></div>
            <ul className="resumen-lista">
              <li><Icono nombre="cancelar" tamano={18} /><div><strong>No da diagnósticos ni indica tratamientos o medicamentos.</strong></div></li>
              <li><Icono nombre="candado" tamano={18} /><div>No escribas datos personales (DNI, teléfono, email).</div></li>
              <li><Icono nombre="alerta" tamano={18} /><div>Ante una emergencia, llamá al <strong>107</strong> o al <strong>911</strong>.</div></li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}

/** Explica por qué el asistente no está disponible y cómo activarlo. */
function AvisoNoDisponible({ carga }: { carga: Carga<EstadoAsistente> }) {
  if (carga.cargando) return null
  if (carga.error) {
    return (
      <div className="alerta alerta-advertencia" role="alert">
        <Icono nombre="servidor" />
        <div className="alerta-cuerpo">
          <strong>El asistente no está disponible</strong>
          <p>{mensajeDeError(carga.error)}</p>
          <p className="texto-tenue">El asistente forma parte del servicio de consultas. El resto del sistema sigue funcionando.</p>
        </div>
      </div>
    )
  }
  const estado = carga.datos
  if (!estado || estado.disponible) return null
  return (
    <div className="alerta alerta-advertencia" role="alert">
      <Icono nombre="alerta" />
      <div className="alerta-cuerpo">
        <strong>El asistente no está disponible</strong>
        <p>{estado.motivo}</p>
        <p className="texto-tenue">
          El asistente es opcional: pacientes, médicos, turnos y consultas funcionan normalmente sin él.
          Para activarlo, iniciá Ollama con <code>docker compose --profile ia up -d</code> y esperá a que se descargue el modelo.
        </p>
      </div>
    </div>
  )
}
