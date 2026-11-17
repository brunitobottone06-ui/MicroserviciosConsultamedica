import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { turnosApi, type FiltrosTurnos } from '../../api/servicios'
import type { EstadoTurno, Turno } from '../../api/tipos'
import { Avisos, Recurso, Vacio } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { Buscador, EncabezadoPagina, Insignia, InsigniaTurno, Persona, Segmentado } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { nombreEspecialidad, nombreMedico, nombrePaciente, useCatalogos } from '../../hooks/useCatalogos'
import { usePermisos } from '../../sesion/Sesion'
import { cantidad, formatoFechaTexto, formatoHora, hoyIso, mayusculaInicial, sumarDias } from '../../utilidades/formato'

type Periodo = 'hoy' | 'semana' | 'proximos' | 'historial'
type FiltroEstado = 'todos' | EstadoTurno

const ordenarPorApellido = <T extends { apellido: string; nombre: string }>(lista: T[]) =>
  [...lista].sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))

function rangoDe(periodo: Periodo): Pick<FiltrosTurnos, 'desde' | 'hasta'> {
  const hoy = hoyIso()
  if (periodo === 'hoy') return { desde: hoy, hasta: hoy }
  if (periodo === 'semana') return { desde: hoy, hasta: sumarDias(hoy, 6) }
  if (periodo === 'proximos') return { desde: hoy }
  return {}
}

/** Agenda de turnos agrupada por día. Para un paciente muestra solo los suyos (lo garantiza el backend). */
export function ListaTurnos() {
  const { esPaciente } = usePermisos()
  const [periodo, setPeriodo] = useState<Periodo>('proximos')
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const [medicoId, setMedicoId] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [texto, setTexto] = useState('')
  const catalogos = useCatalogos()

  const filtros: FiltrosTurnos = {
    ...rangoDe(periodo),
    estado: estado === 'todos' ? undefined : estado,
    medicoId: medicoId ? Number(medicoId) : undefined,
    pacienteId: pacienteId ? Number(pacienteId) : undefined,
  }
  const carga = useCarga(() => turnosApi.listar(filtros), [JSON.stringify(filtros)])

  const grupos = useMemo(() => {
    const buscado = texto.trim().toLowerCase()
    const lista = (carga.datos ?? []).filter((t) => !buscado
      || `${nombrePaciente(catalogos, t.pacienteId)} ${nombreMedico(catalogos, t.medicoId)} ${nombreEspecialidad(catalogos, t.especialidadId)}`
        .toLowerCase().includes(buscado))
    if (periodo === 'historial') lista.reverse() // lo más reciente primero
    const porDia = new Map<string, Turno[]>()
    for (const t of lista) {
      const dia = t.fechaHora.slice(0, 10)
      porDia.set(dia, [...(porDia.get(dia) ?? []), t])
    }
    return { total: lista.length, dias: [...porDia.entries()] }
  }, [carga.datos, texto, periodo, catalogos])

  const hoy = hoyIso()
  const nuevo = esPaciente ? 'Pedir turno' : 'Nuevo turno'

  return (
    <>
      <EncabezadoPagina titulo={esPaciente ? 'Mis turnos' : 'Turnos'} icono="calendario"
        descripcion={esPaciente ? 'Tus turnos en el consultorio.' : 'Agenda del consultorio, agrupada por día.'}
        acciones={<Link to="/turnos/nuevo" className="boton boton-primario"><Icono nombre="calendarioMas" tamano={18} />{nuevo}</Link>} />

      <section className="tarjeta">
        <div className="herramientas">
          <Segmentado etiqueta="Período" valor={periodo} alCambiar={setPeriodo} opciones={[
            { valor: 'hoy', texto: 'Hoy' }, { valor: 'semana', texto: '7 días' },
            { valor: 'proximos', texto: 'Próximos' }, { valor: 'historial', texto: 'Todos' },
          ]} />
          <Segmentado etiqueta="Estado" valor={estado} alCambiar={setEstado} opciones={[
            { valor: 'todos', texto: 'Todos' }, { valor: 'PROGRAMADO', texto: 'Programados' },
            { valor: 'ATENDIDO', texto: 'Atendidos' }, { valor: 'CANCELADO', texto: 'Cancelados' },
          ]} />
        </div>
        <div className="herramientas">
          {!esPaciente && (
            <Buscador id="buscar-turno" etiqueta="Buscar" valor={texto} alCambiar={setTexto} placeholder="Paciente, médico o especialidad" />
          )}
          <div className="campo">
            <label htmlFor="f-medico">Médico</label>
            <select id="f-medico" value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
              <option value="">Todos</option>
              {ordenarPorApellido([...catalogos.medicos.values()]).map((m) => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre}</option>)}
            </select>
          </div>
          {!esPaciente && (
            <div className="campo">
              <label htmlFor="f-paciente">Paciente</label>
              <select id="f-paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
                <option value="">Todos</option>
                {ordenarPorApellido([...catalogos.pacientes.values()]).map((p) => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre} ({p.dni})</option>)}
              </select>
            </div>
          )}
          {carga.datos && <span className="contador">{cantidad(grupos.total, 'turno', 'turnos')}</span>}
        </div>

        <Avisos avisos={catalogos.avisos} />
        <Recurso carga={carga} textoCargando="Cargando turnos...">
          {() => grupos.total === 0 ? (
            <Vacio icono="calendario" titulo="No hay turnos para mostrar"
              accion={<Link to="/turnos/nuevo" className="boton boton-primario"><Icono nombre="calendarioMas" tamano={18} />{nuevo}</Link>}>
              Probá con otro período o estado.
            </Vacio>
          ) : (
            grupos.dias.map(([dia, turnos]) => (
              <div key={dia} className="agenda-dia">
                <h3 className="agenda-fecha">
                  {mayusculaInicial(formatoFechaTexto(dia, dia.slice(0, 4) !== hoy.slice(0, 4)))}
                  {dia === hoy && <Insignia tipo="marca" sinPunto>Hoy</Insignia>}
                </h3>
                <ul className="agenda-lista">
                  {turnos.map((t) => (
                    <li key={t.id} className={`agenda-item ${t.estado === 'CANCELADO' ? 'cancelado' : ''}`}>
                      <div className="agenda-hora">
                        <strong>{formatoHora(t.fechaHora)}</strong>
                        <small>{t.duracionMinutos} min</small>
                      </div>
                      <div className="agenda-detalle">
                        {esPaciente ? (
                          <>
                            <strong>{nombreEspecialidad(catalogos, t.especialidadId)}</strong>
                            <span className="linea"><Icono nombre="medico" tamano={15} />{nombreMedico(catalogos, t.medicoId)}</span>
                          </>
                        ) : (
                          <Persona nombre={nombrePaciente(catalogos, t.pacienteId)} tamano="chico"
                            detalle={`${nombreEspecialidad(catalogos, t.especialidadId)} · ${nombreMedico(catalogos, t.medicoId)}`} />
                        )}
                        {t.motivo && <span className="linea texto-recortado"><Icono nombre="info" tamano={15} />{t.motivo}</span>}
                      </div>
                      <div className="agenda-derecha">
                        <InsigniaTurno estado={t.estado} />
                        <Link to={`/turnos/${t.id}`} className="boton boton-secundario boton-chico">
                          Ver<span className="solo-lectores"> turno de las {formatoHora(t.fechaHora)}</span>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </Recurso>
      </section>
    </>
  )
}
