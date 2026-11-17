import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { consultasApi, turnosApi } from '../../api/servicios'
import type { ConsultaDatos } from '../../api/tipos'
import { Alerta, Avisos, Cargando, MensajeError } from '../../componentes/Estados'
import { Campo, ErrorFormulario, SeccionFormulario, erroresDelServidor } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { EncabezadoPagina, Persona } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { nombreEspecialidad, nombreMedico, nombrePaciente, useCatalogos } from '../../hooks/useCatalogos'
import { formatoFechaHora, formatoFechaTexto, formatoHora } from '../../utilidades/formato'
import { hayErrores, sinError, validarConsulta, type Errores } from '../../utilidades/validaciones'

export function FormularioConsulta() {
  const { id } = useParams()
  const edicion = id !== undefined
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const notificar = useNotificar()
  const catalogos = useCatalogos()

  const [turnoId, setTurnoId] = useState(parametros.get('turnoId') ?? '')
  const [datos, setDatos] = useState<ConsultaDatos>({ motivo: '', diagnostico: '', tratamiento: '', observaciones: '' })
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<unknown>(null)
  const [errorCarga, setErrorCarga] = useState<unknown>(null)
  const [cargando, setCargando] = useState(edicion)
  const [guardando, setGuardando] = useState(false)

  // Turnos que pueden recibir una consulta: los programados (y el que vino preseleccionado).
  const turnos = useCarga(() => (edicion ? Promise.resolve([]) : turnosApi.listar({ estado: 'PROGRAMADO' })), [edicion])
  const turnoPreseleccionado = useCarga(
    () => (!edicion && parametros.get('turnoId') ? turnosApi.obtener(Number(parametros.get('turnoId'))) : Promise.resolve(null)),
    [edicion])

  useEffect(() => {
    if (!edicion) return
    consultasApi.obtener(Number(id))
      .then((c) => {
        setTurnoId(String(c.turnoId))
        setDatos({ motivo: c.motivo, diagnostico: c.diagnostico ?? '', tratamiento: c.tratamiento ?? '', observaciones: c.observaciones ?? '' })
      })
      .catch(setErrorCarga)
      .finally(() => setCargando(false))
  }, [edicion, id])

  const cambiar = (campo: keyof ConsultaDatos, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((actuales) => sinError(actuales, campo))
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const encontrados = validarConsulta({ ...datos, turnoId: turnoId ? Number(turnoId) : null }, !edicion)
    setErrores(encontrados)
    if (hayErrores(encontrados)) return
    setGuardando(true)
    try {
      const consulta = edicion
        ? await consultasApi.actualizar(Number(id), datos)
        : await consultasApi.crear({ ...datos, turnoId: Number(turnoId) })
      notificar(edicion ? 'Consulta actualizada' : 'Consulta registrada. El turno quedó como atendido.')
      navegar(`/consultas/${consulta.id}`)
    } catch (error) {
      setErrores(erroresDelServidor(error))
      setErrorGeneral(error)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando consulta..." />
  if (errorCarga) return <MensajeError error={errorCarga} />

  const opciones = [...(turnos.datos ?? [])]
  const pre = turnoPreseleccionado.datos
  if (pre && !opciones.some((t) => t.id === pre.id)) opciones.unshift(pre)
  const turnoElegido = opciones.find((t) => String(t.id) === turnoId)

  return (
    <>
      <EncabezadoPagina titulo={edicion ? 'Editar consulta' : 'Registrar consulta'} icono="consulta"
        migas={[{ texto: 'Consultas', a: '/consultas' }]}
        descripcion={edicion ? 'Corregí o completá el registro clínico.' : 'Al registrar la consulta, el turno queda marcado como atendido.'} />
      <form className="formulario" onSubmit={guardar} noValidate>
        <ErrorFormulario error={errorGeneral} />
        <Avisos avisos={catalogos.avisos} />
        {!edicion && (
          <SeccionFormulario numero={1} titulo="Turno atendido">
            {turnos.error ? <MensajeError error={turnos.error} alReintentar={turnos.recargar} /> : null}
            <Campo etiqueta="Turno" obligatorio error={errores.turnoId}
              ayuda={opciones.length === 0 && !turnos.cargando ? 'No hay turnos programados pendientes de registrar.' : undefined}>
              {(p) => (
                <select {...p} value={turnoId} onChange={(e) => { setTurnoId(e.target.value); setErrores((a) => sinError(a, 'turnoId')) }}>
                  <option value="">{turnos.cargando ? 'Cargando turnos...' : 'Seleccioná el turno'}</option>
                  {opciones.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatoFechaHora(t.fechaHora)} — {nombrePaciente(catalogos, t.pacienteId)} — {nombreMedico(catalogos, t.medicoId)}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            {turnoElegido && (
              <div className="alerta alerta-info" style={{ marginTop: '0.9rem' }}>
                <Icono nombre="calendario" />
                <div className="alerta-cuerpo">
                  <Persona nombre={nombrePaciente(catalogos, turnoElegido.pacienteId)} tamano="chico"
                    detalle={`${formatoFechaTexto(turnoElegido.fechaHora)}, ${formatoHora(turnoElegido.fechaHora)} hs · ${nombreEspecialidad(catalogos, turnoElegido.especialidadId)} · ${nombreMedico(catalogos, turnoElegido.medicoId)}`} />
                </div>
              </div>
            )}
          </SeccionFormulario>
        )}
        <SeccionFormulario numero={edicion ? undefined : 2} titulo="Registro clínico">
          <Campo etiqueta="Motivo de consulta" obligatorio error={errores.motivo}>
            {(p) => <input {...p} value={datos.motivo} onChange={(e) => cambiar('motivo', e.target.value)} maxLength={500} autoFocus={edicion} />}
          </Campo>
          <Campo etiqueta="Diagnóstico" error={errores.diagnostico} ayuda={`${datos.diagnostico.length}/2000`}>
            {(p) => <textarea {...p} rows={3} value={datos.diagnostico} onChange={(e) => cambiar('diagnostico', e.target.value)} maxLength={2000} />}
          </Campo>
          <Campo etiqueta="Tratamiento / indicaciones" error={errores.tratamiento} ayuda={`${datos.tratamiento.length}/2000`}>
            {(p) => <textarea {...p} rows={3} value={datos.tratamiento} onChange={(e) => cambiar('tratamiento', e.target.value)} maxLength={2000} />}
          </Campo>
          <Campo etiqueta="Observaciones" error={errores.observaciones}>
            {(p) => <textarea {...p} rows={2} value={datos.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} maxLength={2000} />}
          </Campo>
        </SeccionFormulario>
        <Alerta tipo="info" icono="candado">Esta información es confidencial: solo la ven los médicos del consultorio.</Alerta>
        <div className="barra-acciones">
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="check" tamano={18} />{guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <Link to={edicion ? `/consultas/${id}` : '/consultas'} className="boton boton-secundario">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
