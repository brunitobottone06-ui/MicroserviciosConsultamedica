import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { especialidadesApi, medicosApi, pacientesApi, turnosApi } from '../../api/servicios'
import type { Paciente, Turno, TurnoDatos } from '../../api/tipos'
import { Alerta, Cargando, MensajeError } from '../../componentes/Estados'
import { Campo, ErrorFormulario, SeccionFormulario, erroresDelServidor } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { Avatar, Dato, EncabezadoPagina } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { usePermisos } from '../../sesion/Sesion'
import { horaFin, horariosDelDia, proximosDiasDeAtencion } from '../../utilidades/agenda'
import { diaJava, fechaLocal, formatoFechaTexto, hoyIso, partesFecha } from '../../utilidades/formato'
import { hayErrores, sinError, validarTurno, type Errores } from '../../utilidades/validaciones'

interface Estado {
  pacienteId: string
  especialidadId: string
  medicoId: string
  fecha: string
  hora: string
  duracionMinutos: string
  motivo: string
}

const DURACIONES = [15, 20, 30, 45, 60, 90]
const CAMPOS_DEL_PASO_1 = ['pacienteId', 'especialidadId', 'medicoId', 'fecha', 'hora', 'duracionMinutos', 'motivo', 'fechaHora']

/**
 * Reserva o reprogramación de un turno, en dos pasos:
 *   1. Datos: paciente (personal), especialidad, profesional, día, horario y duración -> "Siguiente".
 *   2. Confirmación: resumen tipo comprobante -> "Confirmar turno" (recién ahí se envía).
 * Un paciente solo puede reservar para sí mismo (el backend también lo verifica).
 */
export function FormularioTurno() {
  const { id } = useParams()
  const edicion = id !== undefined
  const { esPaciente, pacienteId: miPacienteId } = usePermisos()
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const notificar = useNotificar()

  const [paso, setPaso] = useState<'datos' | 'confirmar'>('datos')
  const [datos, setDatos] = useState<Estado>({
    pacienteId: esPaciente ? String(miPacienteId ?? '') : (parametros.get('pacienteId') ?? ''),
    especialidadId: '', medicoId: '', fecha: '', hora: '', duracionMinutos: '30', motivo: '',
  })
  const [buscarPaciente, setBuscarPaciente] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<unknown>(null)
  const [errorCarga, setErrorCarga] = useState<unknown>(null)
  const [estadoTurno, setEstadoTurno] = useState<string | null>(null)
  const [cargando, setCargando] = useState(edicion)
  const [guardando, setGuardando] = useState(false)

  // Un paciente no puede listar a otros pacientes: solo se carga su propia ficha.
  const pacientes = useCarga<Paciente[]>(
    () => (esPaciente ? pacientesApi.obtener(miPacienteId ?? 0).then((p) => [p]) : pacientesApi.listar({ incluirInactivos: true })),
    [esPaciente, miPacienteId])
  const especialidades = useCarga(() => especialidadesApi.listar({ incluirInactivas: true }), [])
  const horario = useCarga(() => turnosApi.horario(), [])
  const medicos = useCarga(
    () => (datos.especialidadId ? medicosApi.listar({ especialidadId: Number(datos.especialidadId) }) : Promise.resolve([])),
    [datos.especialidadId])
  // Turnos programados del médico ese día, para marcar horarios ocupados.
  const ocupados = useCarga<Turno[]>(
    () => (datos.medicoId && datos.fecha
      ? turnosApi.listar({ medicoId: Number(datos.medicoId), desde: datos.fecha, hasta: datos.fecha, estado: 'PROGRAMADO' })
      : Promise.resolve([])),
    [datos.medicoId, datos.fecha])

  useEffect(() => {
    if (!edicion) return
    turnosApi.obtener(Number(id))
      .then((t) => {
        setEstadoTurno(t.estado)
        setDatos({
          pacienteId: String(t.pacienteId), especialidadId: String(t.especialidadId), medicoId: String(t.medicoId),
          fecha: t.fechaHora.slice(0, 10), hora: t.fechaHora.slice(11, 16),
          duracionMinutos: String(t.duracionMinutos), motivo: t.motivo ?? '',
        })
      })
      .catch(setErrorCarga)
      .finally(() => setCargando(false))
  }, [edicion, id])

  const cambiar = (campo: keyof Estado, valor: string) => {
    setDatos((d) => {
      const nuevo = { ...d, [campo]: valor }
      // Elegir otra especialidad obliga a elegir de nuevo el médico; cambiar médico, día o duración, el horario
      if (campo === 'especialidadId') { nuevo.medicoId = ''; nuevo.hora = '' }
      if (campo === 'medicoId' || campo === 'fecha' || campo === 'duracionMinutos') nuevo.hora = ''
      return nuevo
    })
    setErrores((actuales) => sinError(actuales, campo, campo === 'especialidadId' ? 'medicoId' : '', 'hora'))
  }

  const dias = useMemo(() => (horario.datos ? proximosDiasDeAtencion(horario.datos, 12) : []), [horario.datos])
  const diaAtiende = !datos.fecha || !horario.datos || horario.datos.dias.includes(diaJava(fechaLocal(datos.fecha)))
  const horarios = useMemo(() => {
    if (!horario.datos || !datos.fecha || !diaAtiende) return []
    const otros = (ocupados.datos ?? []).filter((t) => String(t.id) !== id)
    return horariosDelDia(datos.fecha, horario.datos, Number(datos.duracionMinutos), otros)
  }, [horario.datos, datos.fecha, datos.duracionMinutos, ocupados.datos, id, diaAtiende])

  const aTurnoDatos = (): TurnoDatos => ({
    pacienteId: datos.pacienteId ? Number(datos.pacienteId) : null,
    especialidadId: datos.especialidadId ? Number(datos.especialidadId) : null,
    medicoId: datos.medicoId ? Number(datos.medicoId) : null,
    fechaHora: `${datos.fecha}T${datos.hora}`,
    duracionMinutos: Number(datos.duracionMinutos),
    motivo: datos.motivo,
  })

  /** Paso 1 -> 2: valida y muestra el resumen (todavía no se guarda nada). */
  const siguiente = (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const encontrados = validarTurno(aTurnoDatos(), horario.datos ?? null)
    setErrores(encontrados)
    if (!hayErrores(encontrados)) setPaso('confirmar')
  }

  /** Paso 2: envía el turno al servicio de turnos. */
  const confirmar = async () => {
    setErrorGeneral(null)
    setGuardando(true)
    try {
      const turno = aTurnoDatos()
      const guardado = edicion ? await turnosApi.actualizar(Number(id), turno) : await turnosApi.crear(turno)
      notificar(edicion ? 'Turno reprogramado correctamente' : '¡Turno confirmado!')
      navegar(`/turnos/${guardado.id}`)
    } catch (error) {
      const delServidor = erroresDelServidor(error)
      const deCampos = delServidor.fechaHora ? { ...delServidor, fecha: delServidor.fechaHora } : delServidor
      setErrores(deCampos)
      setErrorGeneral(error)
      if (Object.keys(deCampos).some((c) => CAMPOS_DEL_PASO_1.includes(c))) setPaso('datos')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando turno..." />
  if (errorCarga) return <MensajeError error={errorCarga} />
  if (edicion && estadoTurno !== 'PROGRAMADO') {
    return (
      <Alerta tipo="advertencia" titulo="Este turno no se puede modificar">
        <p>Solo se pueden modificar turnos programados.</p>
        <Link to={`/turnos/${id}`} className="boton boton-secundario boton-chico">Volver al turno</Link>
      </Alerta>
    )
  }

  const texto = buscarPaciente.trim().toLowerCase()
  const opcionesPacientes = (pacientes.datos ?? [])
    .filter((p) => p.activo || String(p.id) === datos.pacienteId)
    .filter((p) => !texto || String(p.id) === datos.pacienteId || `${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase().includes(texto))
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))
  const opcionesEspecialidades = (especialidades.datos ?? []).filter((e) => e.activa || String(e.id) === datos.especialidadId)
  const paciente = pacientes.datos?.find((p) => String(p.id) === datos.pacienteId)
  const especialidad = especialidades.datos?.find((e) => String(e.id) === datos.especialidadId)
  const medico = medicos.datos?.find((m) => String(m.id) === datos.medicoId)
  const titulo = edicion ? 'Reprogramar turno' : esPaciente ? 'Pedir turno' : 'Nuevo turno'
  const manana = horarios.filter((h) => h.hora < '13:00')
  const tarde = horarios.filter((h) => h.hora >= '13:00')
  let numero = 0

  return (
    <>
      <EncabezadoPagina titulo={titulo} icono="calendarioMas"
        migas={[{ texto: esPaciente ? 'Mis turnos' : 'Turnos', a: '/turnos' }]}
        descripcion={paso === 'datos' ? 'Paso 1 de 2: elegí la especialidad, el profesional, el día y el horario.' : 'Paso 2 de 2: revisá los datos y confirmá.'} />
      <ol className="pasos" aria-label="Pasos de la reserva">
        <li className={paso === 'datos' ? 'actual' : 'hecho'} aria-current={paso === 'datos' ? 'step' : undefined}>
          <span>{paso === 'datos' ? '1' : <Icono nombre="check" tamano={14} />}</span>Datos del turno
        </li>
        <li className={paso === 'confirmar' ? 'actual' : ''} aria-current={paso === 'confirmar' ? 'step' : undefined}><span>2</span>Confirmación</li>
      </ol>

      {paso === 'datos' && (
        <form className="reserva" onSubmit={siguiente} noValidate>
          <div className="formulario">
            <ErrorFormulario error={errorGeneral} titulo="No se pudo reservar el turno" />
            {[pacientes, especialidades].map((c, i) => c.error ? <MensajeError key={i} error={c.error} alReintentar={c.recargar} /> : null)}

            {!esPaciente && (
              <SeccionFormulario numero={++numero} titulo="Paciente" descripcion="Buscá por nombre, apellido o DNI.">
                <div className="grilla-campos">
                  <Campo etiqueta="Buscar paciente">
                    {(p) => <input {...p} type="search" value={buscarPaciente} placeholder="Ej.: Torres o 30111222"
                      onChange={(e) => setBuscarPaciente(e.target.value)} />}
                  </Campo>
                  <Campo etiqueta="Paciente" obligatorio error={errores.pacienteId}>
                    {(p) => (
                      <select {...p} value={datos.pacienteId} onChange={(e) => cambiar('pacienteId', e.target.value)}>
                        <option value="">{pacientes.cargando ? 'Cargando...' : `Seleccioná un paciente (${opcionesPacientes.length})`}</option>
                        {opcionesPacientes.map((x) => <option key={x.id} value={x.id}>{x.apellido}, {x.nombre} — DNI {x.dni}</option>)}
                      </select>
                    )}
                  </Campo>
                </div>
              </SeccionFormulario>
            )}

            <SeccionFormulario numero={++numero} titulo="Especialidad" id="titulo-especialidad">
              {especialidades.cargando && !especialidades.datos && <Cargando texto="Cargando especialidades..." lineas={0} />}
              <fieldset className="opciones" aria-labelledby="titulo-especialidad" aria-invalid={Boolean(errores.especialidadId)}>
                {opcionesEspecialidades.map((esp) => (
                  <label key={esp.id} className="opcion">
                    <input type="radio" name="especialidad" value={esp.id} checked={datos.especialidadId === String(esp.id)}
                      onChange={() => cambiar('especialidadId', String(esp.id))} />
                    <span className="opcion-caja">
                      <span className="icono-especialidad" style={{ width: 34, height: 34, borderRadius: 10 }}><Icono nombre="especialidad" tamano={18} /></span>
                      <span>{esp.nombre}</span>
                      <Icono nombre="check" tamano={18} className="opcion-marca" />
                    </span>
                  </label>
                ))}
              </fieldset>
              {errores.especialidadId && <small className="error-campo"><Icono nombre="alerta" tamano={14} />{errores.especialidadId}</small>}
            </SeccionFormulario>

            <SeccionFormulario numero={++numero} titulo="Profesional" id="titulo-medico" deshabilitada={!datos.especialidadId}
              descripcion={datos.especialidadId ? 'Solo se muestran los médicos que atienden la especialidad elegida.' : 'Primero elegí una especialidad.'}>
              {medicos.cargando && datos.especialidadId && <Cargando texto="Buscando profesionales..." lineas={0} />}
              {medicos.error ? <MensajeError error={medicos.error} alReintentar={medicos.recargar} /> : null}
              {datos.especialidadId && medicos.datos?.length === 0 && (
                <p className="texto-suave">No hay médicos activos para esta especialidad. Elegí otra o consultá en recepción.</p>
              )}
              <fieldset className="opciones opciones-anchas" aria-labelledby="titulo-medico">
                {(medicos.datos ?? []).map((m) => (
                  <label key={m.id} className="opcion">
                    <input type="radio" name="medico" value={m.id} checked={datos.medicoId === String(m.id)}
                      onChange={() => cambiar('medicoId', String(m.id))} />
                    <span className="opcion-caja">
                      <Avatar nombre={`${m.nombre} ${m.apellido}`} />
                      <span>{m.apellido}, {m.nombre}<small>Matrícula {m.matricula}</small></span>
                      <Icono nombre="check" tamano={18} className="opcion-marca" />
                    </span>
                  </label>
                ))}
              </fieldset>
              {errores.medicoId && <small className="error-campo"><Icono nombre="alerta" tamano={14} />{errores.medicoId}</small>}
            </SeccionFormulario>

            <SeccionFormulario numero={++numero} titulo="Día y horario" id="titulo-dia"
              descripcion={horario.datos ? `Atención: ${horario.datos.descripcion}.` : undefined}>
              {horario.error ? <Alerta tipo="advertencia">No se pudo obtener el horario de atención; el horario se validará al confirmar.</Alerta> : null}
              {dias.length > 0 && (
                <fieldset className="dias" aria-labelledby="titulo-dia">
                  {dias.map((dia) => {
                    const p = partesFecha(dia)
                    return (
                      <label key={dia} className="opcion">
                        <input type="radio" name="dia" value={dia} checked={datos.fecha === dia} aria-label={formatoFechaTexto(dia)}
                          onChange={() => cambiar('fecha', dia)} />
                        <span className="opcion-caja"><span>{dia === hoyIso() ? 'hoy' : p.dia}</span><strong>{p.numero}</strong><small>{p.mes}</small></span>
                      </label>
                    )
                  })}
                </fieldset>
              )}
              <div className="grilla-campos" style={{ marginTop: '0.75rem' }}>
                <Campo etiqueta="Otra fecha" error={errores.fecha} ayuda="Para fechas más adelante.">
                  {(p) => <input {...p} type="date" min={hoyIso()} value={datos.fecha} onChange={(e) => cambiar('fecha', e.target.value)} />}
                </Campo>
                <Campo etiqueta="Duración" obligatorio error={errores.duracionMinutos}>
                  {(p) => (
                    <select {...p} value={datos.duracionMinutos} onChange={(e) => cambiar('duracionMinutos', e.target.value)}>
                      {DURACIONES.map((d) => <option key={d} value={d}>{d} minutos</option>)}
                    </select>
                  )}
                </Campo>
              </div>

              {datos.fecha && (
                <div style={{ marginTop: '0.25rem' }}>
                  <h3 id="titulo-horario" style={{ marginBottom: '0.6rem' }}>Horarios para el {formatoFechaTexto(datos.fecha)}</h3>
                  {!diaAtiende && <Alerta tipo="advertencia">El consultorio no atiende ese día. Elegí otra fecha.</Alerta>}
                  {ocupados.error ? <Alerta tipo="advertencia">No se pudo verificar qué horarios están ocupados; se comprobará al confirmar.</Alerta> : null}
                  {!datos.medicoId && <p className="texto-tenue">Elegí un profesional para ver la disponibilidad.</p>}
                  {datos.medicoId && horarios.length > 0 && (
                    <div role="radiogroup" aria-labelledby="titulo-horario">
                      {[{ titulo: 'Mañana', lista: manana }, { titulo: 'Tarde', lista: tarde }].filter((g) => g.lista.length > 0).map((g) => (
                        <div key={g.titulo} className="horarios-grupo">
                          <h4><Icono nombre="reloj" tamano={14} />{g.titulo}</h4>
                          <div className="horarios">
                            {g.lista.map((h) => (
                              <label key={h.hora} className="opcion" title={h.motivo}>
                                <input type="radio" name="hora" value={h.hora} checked={datos.hora === h.hora} disabled={!h.disponible}
                                  onChange={() => cambiar('hora', h.hora)} />
                                <span className="opcion-caja">{h.hora}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      {esPaciente && (
                        <p className="texto-tenue" style={{ marginTop: '0.75rem' }}>
                          La disponibilidad definitiva se confirma al reservar: si otra persona tomó ese horario, te vamos a avisar.
                        </p>
                      )}
                    </div>
                  )}
                  {errores.hora && <small className="error-campo"><Icono nombre="alerta" tamano={14} />{errores.hora}</small>}
                </div>
              )}
              {!datos.fecha && errores.hora && <small className="error-campo"><Icono nombre="alerta" tamano={14} />Elegí un día y un horario</small>}
            </SeccionFormulario>

            <SeccionFormulario numero={++numero} titulo="Motivo (opcional)">
              <Campo etiqueta="Motivo de la visita" error={errores.motivo}
                ayuda="Ej.: control, primera vez, entrega de estudios. No escribas síntomas ni datos clínicos.">
                {(p) => <input {...p} value={datos.motivo} onChange={(e) => cambiar('motivo', e.target.value)} maxLength={255} />}
              </Campo>
            </SeccionFormulario>

            <div className="barra-acciones">
              <button type="submit" className="boton boton-primario boton-grande">Siguiente<Icono nombre="derecha" tamano={18} /></button>
              <Link to={edicion ? `/turnos/${id}` : '/turnos'} className="boton boton-secundario boton-grande">Cancelar</Link>
              <span className="texto-tenue">Todavía no se reserva nada: vas a poder revisar antes de confirmar.</span>
            </div>
          </div>

          <aside className="tarjeta resumen-lateral" aria-label="Resumen de la reserva">
            <div className="tarjeta-titulo"><h2><Icono nombre="consulta" />Tu reserva</h2></div>
            <ul className="resumen-lista">
              <li><Icono nombre="usuario" tamano={18} /><div><span>Paciente</span>
                {paciente ? <strong>{paciente.nombre} {paciente.apellido}</strong> : <strong className="pendiente">Sin elegir</strong>}</div></li>
              <li><Icono nombre="especialidad" tamano={18} /><div><span>Especialidad</span>
                {especialidad ? <strong>{especialidad.nombre}</strong> : <strong className="pendiente">Sin elegir</strong>}</div></li>
              <li><Icono nombre="medico" tamano={18} /><div><span>Profesional</span>
                {medico ? <strong>{medico.nombre} {medico.apellido}</strong> : <strong className="pendiente">Sin elegir</strong>}</div></li>
              <li><Icono nombre="calendario" tamano={18} /><div><span>Día</span>
                {datos.fecha ? <strong>{formatoFechaTexto(datos.fecha)}</strong> : <strong className="pendiente">Sin elegir</strong>}</div></li>
              <li><Icono nombre="reloj" tamano={18} /><div><span>Horario</span>
                {datos.hora ? <strong>{datos.hora} a {horaFin(datos.hora, Number(datos.duracionMinutos))} hs</strong> : <strong className="pendiente">Sin elegir</strong>}</div></li>
            </ul>
          </aside>
        </form>
      )}

      {paso === 'confirmar' && (
        <section className="ticket" aria-labelledby="titulo-resumen" style={{ maxWidth: 720 }}>
          <div className="ticket-cabecera">
            {(() => {
              const p = partesFecha(datos.fecha)
              return <div className="dia-grande" aria-hidden="true"><span>{p.dia}</span><strong>{p.numero}</strong><small>{p.mes}</small></div>
            })()}
            <div>
              <h2 id="titulo-resumen">Revisá tu turno</h2>
              <p>{formatoFechaTexto(datos.fecha, true)} · {datos.hora} a {horaFin(datos.hora, Number(datos.duracionMinutos))} hs</p>
            </div>
          </div>
          <div className="ticket-cuerpo">
            <ErrorFormulario error={errorGeneral} titulo="No se pudo confirmar el turno" />
            <dl className="datos" style={{ marginTop: errorGeneral ? '1rem' : 0 }}>
              <Dato etiqueta="Paciente">{paciente ? `${paciente.nombre} ${paciente.apellido}` : `Paciente #${datos.pacienteId}`}</Dato>
              <Dato etiqueta="Especialidad">{especialidad?.nombre}</Dato>
              <Dato etiqueta="Profesional">{medico ? `${medico.nombre} ${medico.apellido}` : `Médico #${datos.medicoId}`}</Dato>
              <Dato etiqueta="Horario">{datos.hora} hs · {datos.duracionMinutos} minutos</Dato>
              <Dato etiqueta="Motivo">{datos.motivo}</Dato>
            </dl>
            <div className="acciones" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="boton boton-primario boton-grande" onClick={() => void confirmar()} disabled={guardando}>
                <Icono nombre="check" tamano={18} />{guardando ? 'Confirmando...' : edicion ? 'Confirmar cambios' : 'Confirmar turno'}
              </button>
              <button type="button" className="boton boton-secundario boton-grande" onClick={() => setPaso('datos')} disabled={guardando}>
                <Icono nombre="izquierda" tamano={18} />Volver
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
