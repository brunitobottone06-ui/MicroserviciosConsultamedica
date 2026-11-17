import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { mensajeDeError } from '../api/cliente'
import { asistenteApi, consultasApi, medicosApi, pacientesApi, saludApi, turnosApi, type NombreServicio } from '../api/servicios'
import type { Consulta, EstadoAsistente, Turno } from '../api/tipos'
import { Avisos, MensajeError, Recurso, Vacio } from '../componentes/Estados'
import { Icono, type NombreIcono } from '../componentes/Icono'
import { InsigniaTurno, Metrica, Persona } from '../componentes/Varios'
import { useCarga } from '../hooks/useCarga'
import { nombreEspecialidad, nombreMedico, nombrePaciente, useCatalogos, type Catalogos } from '../hooks/useCatalogos'
import { usePermisos, useSesion } from '../sesion/Sesion'
import { formatoFechaTexto, formatoHora, hoyIso, mayusculaInicial, partesFecha, saludo, sumarDias, tiempoRelativo } from '../utilidades/formato'

const SERVICIOS: { clave: NombreServicio; nombre: string }[] = [
  { clave: 'pacientes', nombre: 'Pacientes' },
  { clave: 'medicos', nombre: 'Médicos' },
  { clave: 'especialidades', nombre: 'Especialidades' },
  { clave: 'turnos', nombre: 'Turnos' },
  { clave: 'consultas', nombre: 'Consultas' },
]

type Salud = { estado: 'verificando' } | { estado: 'ok' } | { estado: 'caido'; detalle: string }

/** Consulta el health check de cada microservicio de forma independiente. */
function EstadoServicios() {
  const [salud, setSalud] = useState<Record<string, Salud>>({})
  const [asistente, setAsistente] = useState<EstadoAsistente | null | 'error'>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setSalud({})
    setAsistente(null)
    for (const s of SERVICIOS) {
      saludApi.consultar(s.clave)
        .then((r) => vigente && setSalud((a) => ({ ...a, [s.clave]: r.status === 'UP' ? { estado: 'ok' } : { estado: 'caido', detalle: `Estado: ${r.status}` } })))
        .catch((e: unknown) => vigente && setSalud((a) => ({ ...a, [s.clave]: { estado: 'caido', detalle: mensajeDeError(e) } })))
    }
    asistenteApi.estado().then((r) => vigente && setAsistente(r)).catch(() => vigente && setAsistente('error'))
    return () => {
      vigente = false
    }
  }, [version])

  const estadoAsistente = asistente === null ? 'verificando' : asistente !== 'error' && asistente.disponible ? 'ok' : 'caido'
  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo">
        <h2><Icono nombre="servidor" />Estado del sistema</h2>
        <button type="button" className="boton boton-fantasma boton-chico" onClick={() => setVersion((v) => v + 1)}>
          <Icono nombre="refrescar" tamano={16} />Verificar
        </button>
      </div>
      <ul className="servicios">
        {SERVICIOS.map((s) => {
          const e = salud[s.clave] ?? { estado: 'verificando' }
          return (
            <li key={s.clave} className={`servicio estado-${e.estado}`} title={e.estado === 'caido' ? e.detalle : undefined}>
              <span className="punto" aria-hidden="true" />
              <div>
                {s.nombre}
                <small>{e.estado === 'verificando' ? 'Verificando…' : e.estado === 'ok' ? 'Funcionando' : 'No disponible'}</small>
              </div>
            </li>
          )
        })}
        <li className={`servicio estado-${estadoAsistente}`}>
          <span className="punto" aria-hidden="true" />
          <div>
            Asistente IA
            <small>{estadoAsistente === 'verificando' ? 'Verificando…' : estadoAsistente === 'ok' ? 'Conectado' : 'Desconectado (opcional)'}</small>
          </div>
        </li>
      </ul>
    </section>
  )
}

/** Fila compacta de un turno para la agenda. */
function FilaTurno({ turno, catalogos, mostrarPaciente = true }: { turno: Turno; catalogos: Catalogos; mostrarPaciente?: boolean }) {
  return (
    <li className={`agenda-item ${turno.estado === 'CANCELADO' ? 'cancelado' : ''}`}>
      <div className="agenda-hora">
        <strong>{formatoHora(turno.fechaHora)}</strong>
        <small>{turno.duracionMinutos} min</small>
      </div>
      <div className="agenda-detalle">
        {mostrarPaciente
          ? <Persona nombre={nombrePaciente(catalogos, turno.pacienteId)} detalle={`${nombreEspecialidad(catalogos, turno.especialidadId)} · ${nombreMedico(catalogos, turno.medicoId)}`} tamano="chico" />
          : <>
            <strong>{nombreEspecialidad(catalogos, turno.especialidadId)}</strong>
            <span className="linea"><Icono nombre="medico" tamano={15} />{nombreMedico(catalogos, turno.medicoId)}</span>
          </>}
      </div>
      <div className="agenda-derecha">
        <InsigniaTurno estado={turno.estado} />
        <Link to={`/turnos/${turno.id}`} className="boton boton-secundario boton-chico" aria-label={`Ver turno de las ${formatoHora(turno.fechaHora)}`}>Ver</Link>
      </div>
    </li>
  )
}

interface EventoActividad {
  fecha: string
  icono: NombreIcono
  tono: string
  texto: string
  detalle: string
  a: string
  turno?: Turno
}

/** Panel para administración y médicos. */
function PanelPersonal() {
  const { usuario } = useSesion()
  const { esAdministrativo, esMedico } = usePermisos()
  const hoy = hoyIso()
  const turnos = useCarga(() => turnosApi.listar(), [])
  const pacientes = useCarga(() => pacientesApi.listar(), [])
  const medicos = useCarga(() => medicosApi.listar(), [])
  const consultas = useCarga<Consulta[] | null>(() => (esMedico ? consultasApi.listar() : Promise.resolve(null)), [esMedico])
  const catalogos = useCatalogos()

  const resumen = useMemo(() => {
    const lista = turnos.datos ?? []
    const deHoy = lista.filter((t) => t.fechaHora.startsWith(hoy)).sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
    const enSemana = lista.filter((t) => t.estado === 'PROGRAMADO' && t.fechaHora.slice(0, 10) > hoy && t.fechaHora.slice(0, 10) <= sumarDias(hoy, 7))
    return {
      deHoy,
      activosHoy: deHoy.filter((t) => t.estado !== 'CANCELADO').length,
      atendidosHoy: deHoy.filter((t) => t.estado === 'ATENDIDO').length,
      pendientesHoy: deHoy.filter((t) => t.estado === 'PROGRAMADO').length,
      enSemana: enSemana.length,
    }
  }, [turnos.datos, hoy])

  const actividad = useMemo<EventoActividad[]>(() => {
    const eventos: EventoActividad[] = (turnos.datos ?? []).map((t) => ({
      fecha: t.creadoEn,
      icono: 'calendarioMas',
      tono: 'tono-primario',
      texto: `Turno reservado: ${nombrePaciente(catalogos, t.pacienteId)} con ${nombreMedico(catalogos, t.medicoId)}`,
      detalle: `para el ${formatoFechaTexto(t.fechaHora)} a las ${formatoHora(t.fechaHora)}`,
      a: `/turnos/${t.id}`,
      turno: t,
    }))
    for (const c of consultas.datos ?? []) {
      eventos.push({
        fecha: c.registradaEn, icono: 'consulta', tono: 'tono-exito',
        texto: `Consulta registrada: ${nombrePaciente(catalogos, c.pacienteId)}`,
        detalle: c.motivo, a: `/consultas/${c.id}`,
      })
    }
    return eventos.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6)
  }, [turnos.datos, consultas.datos, catalogos])

  const especialidadesCubiertas = new Set((medicos.datos ?? []).flatMap((m) => m.especialidadIds)).size
  const valor = (n: number | undefined, error: unknown) => (error ? '—' : n === undefined ? '…' : n)

  return (
    <>
      <section className="bienvenida">
        <Icono nombre="cruz" tamano={190} className="bienvenida-decoracion" />
        <h1>{saludo()}, {usuario?.nombre.split(' ')[0]}</h1>
        <p>
          {turnos.datos
            ? resumen.pendientesHoy > 0
              ? `Hoy quedan ${resumen.pendientesHoy} ${resumen.pendientesHoy === 1 ? 'turno pendiente' : 'turnos pendientes'} de atención.`
              : 'No quedan turnos pendientes para hoy.'
            : 'Este es el resumen de la actividad del consultorio.'}
        </p>
        <div className="acciones">
          <Link to="/turnos/nuevo" className="boton boton-primario"><Icono nombre="calendarioMas" tamano={18} />Nuevo turno</Link>
          {esAdministrativo && <Link to="/pacientes/nuevo" className="boton boton-secundario"><Icono nombre="pacientes" tamano={18} />Nuevo paciente</Link>}
          {esMedico && <Link to="/consultas/nueva" className="boton boton-secundario"><Icono nombre="consulta" tamano={18} />Registrar consulta</Link>}
          <Link to="/turnos" className="boton boton-secundario"><Icono nombre="calendario" tamano={18} />Ver agenda</Link>
        </div>
      </section>

      <div className="metricas">
        <Metrica icono="calendario" etiqueta="Turnos de hoy" valor={valor(turnos.datos ? resumen.activosHoy : undefined, turnos.error)}
          detalle={turnos.datos ? `${resumen.atendidosHoy} atendidos · ${resumen.pendientesHoy} pendientes` : undefined} a="/turnos" />
        <Metrica icono="tendencia" tono="acento" etiqueta="Próximos 7 días" valor={valor(turnos.datos ? resumen.enSemana : undefined, turnos.error)}
          detalle="turnos programados" a="/turnos" />
        <Metrica icono="pacientes" tono="info" etiqueta="Pacientes activos" valor={valor(pacientes.datos?.length, pacientes.error)}
          detalle={pacientes.error ? 'servicio no disponible' : 'registrados en el sistema'} a="/pacientes" />
        <Metrica icono="medico" tono="exito" etiqueta="Médicos activos" valor={valor(medicos.datos?.length, medicos.error)}
          detalle={medicos.error ? 'servicio no disponible' : `en ${especialidadesCubiertas} especialidades`} a="/medicos" />
      </div>

      <div className="grilla-panel">
        <div className="columna">
          <section className="tarjeta">
            <div className="tarjeta-titulo">
              <h2><Icono nombre="reloj" />Agenda de hoy</h2>
              <Link to="/turnos" className="boton boton-fantasma boton-chico">Ver todos<Icono nombre="derecha" tamano={16} /></Link>
            </div>
            <Avisos avisos={catalogos.avisos} />
            <Recurso carga={turnos} textoCargando="Cargando la agenda de hoy...">
              {() => resumen.deHoy.length === 0
                ? <Vacio icono="calendario" titulo="Sin turnos para hoy">Los turnos que se reserven para hoy van a aparecer acá.</Vacio>
                : <ul className="agenda-lista">{resumen.deHoy.map((t) => <FilaTurno key={t.id} turno={t} catalogos={catalogos} />)}</ul>}
            </Recurso>
          </section>
        </div>

        <div className="columna">
          <section className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono nombre="actividad" />Actividad reciente</h2></div>
            {turnos.error ? <MensajeError error={turnos.error} alReintentar={turnos.recargar} /> : turnos.cargando && !turnos.datos ? (
              <p className="texto-tenue">Cargando actividad…</p>
            ) : actividad.length === 0 ? (
              <Vacio icono="actividad">Todavía no hay actividad registrada.</Vacio>
            ) : (
              <ul className="lista-actividad">
                {actividad.map((e) => (
                  <li key={`${e.a}-${e.fecha}`} className={e.tono}>
                    <span className="actividad-icono metrica-icono"><Icono nombre={e.icono} tamano={17} /></span>
                    <div className="actividad-texto">
                      <Link to={e.a}>{e.texto}</Link>
                      <small>{tiempoRelativo(e.fecha)} · {e.detalle} {e.turno && <InsigniaTurno estado={e.turno.estado} />}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <EstadoServicios />
        </div>
      </div>
    </>
  )
}

/** Inicio para pacientes: su próximo turno destacado, el resto de sus turnos y el horario. */
function InicioPaciente() {
  const { usuario } = useSesion()
  const hoy = hoyIso()
  const carga = useCarga(() => turnosApi.listar({ desde: hoy, estado: 'PROGRAMADO' }), [hoy])
  const horario = useCarga(() => turnosApi.horario(), [])
  const catalogos = useCatalogos()

  return (
    <>
      <section className="bienvenida">
        <Icono nombre="especialidad" tamano={190} className="bienvenida-decoracion" />
        <h1>{saludo()}, {usuario?.nombre.split(' ')[0]}</h1>
        <p>Desde acá podés pedir turnos, revisar los que tenés y consultar al asistente del consultorio.</p>
        <div className="acciones">
          <Link to="/turnos/nuevo" className="boton boton-primario"><Icono nombre="calendarioMas" tamano={18} />Pedir turno</Link>
          <Link to="/asistente" className="boton boton-secundario"><Icono nombre="asistente" tamano={18} />Consultar al asistente</Link>
        </div>
      </section>

      <div className="grilla-panel">
        <section className="tarjeta">
          <div className="tarjeta-titulo">
            <h2><Icono nombre="calendario" />Tus próximos turnos</h2>
            <Link to="/turnos" className="boton boton-fantasma boton-chico">Ver todos<Icono nombre="derecha" tamano={16} /></Link>
          </div>
          <Recurso carga={carga} textoCargando="Cargando tus turnos...">
            {(turnos) => {
              if (turnos.length === 0) {
                return (
                  <Vacio icono="calendarioMas" titulo="No tenés turnos programados"
                    accion={<Link to="/turnos/nuevo" className="boton boton-primario">Pedir turno</Link>}>
                    Cuando reserves un turno lo vas a ver acá.
                  </Vacio>
                )
              }
              const [proximo, ...resto] = turnos
              const p = partesFecha(proximo.fechaHora)
              return (
                <>
                  <div className="turno-destacado">
                    <div className="dia-grande" aria-hidden="true"><span>{p.dia}</span><strong>{p.numero}</strong><small>{p.mes}</small></div>
                    <div className="agenda-detalle">
                      <span className="texto-tenue">Tu próximo turno</span>
                      <strong>{formatoFechaTexto(proximo.fechaHora)}, {formatoHora(proximo.fechaHora)} hs</strong>
                      <span className="linea"><Icono nombre="especialidad" tamano={15} />{nombreEspecialidad(catalogos, proximo.especialidadId)}</span>
                      <span className="linea"><Icono nombre="medico" tamano={15} />{nombreMedico(catalogos, proximo.medicoId)}</span>
                    </div>
                    <Link to={`/turnos/${proximo.id}`} className="boton boton-secundario" style={{ marginLeft: 'auto' }}>Ver detalle</Link>
                  </div>
                  {resto.length > 0 && (
                    <ul className="agenda-lista" style={{ marginTop: '1.1rem' }}>
                      {resto.map((t) => <FilaTurno key={t.id} turno={t} catalogos={catalogos} mostrarPaciente={false} />)}
                    </ul>
                  )}
                </>
              )
            }}
          </Recurso>
        </section>

        <div className="columna">
          <section className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono nombre="reloj" />Horario de atención</h2></div>
            <Recurso carga={horario} textoCargando="Cargando horario..." lineas={1}>
              {(h) => <p><strong>{mayusculaInicial(h.descripcion)}</strong></p>}
            </Recurso>
            <p className="texto-tenue" style={{ marginTop: '0.6rem' }}>
              Si no podés asistir, cancelá el turno desde "Mis turnos" para liberar el horario.
            </p>
          </section>
          <section className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono nombre="asistente" />¿Tenés dudas?</h2></div>
            <p className="texto-suave">El asistente responde preguntas sobre horarios, turnos y el uso del sistema.</p>
            <Link to="/asistente" className="boton boton-secundario" style={{ marginTop: '0.9rem' }}>Abrir asistente</Link>
          </section>
        </div>
      </div>
    </>
  )
}

export function Inicio() {
  const { esPaciente } = usePermisos()
  return esPaciente ? <InicioPaciente /> : <PanelPersonal />
}
