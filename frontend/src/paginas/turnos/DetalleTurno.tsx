import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { consultasApi, turnosApi } from '../../api/servicios'
import type { Consulta, Turno } from '../../api/tipos'
import { Alerta, Avisos, MensajeError, Recurso } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { BotonConfirmar, Dato, EncabezadoPagina, InsigniaTurno, Persona } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { nombreEspecialidad, nombreMedico, nombrePaciente, useCatalogos } from '../../hooks/useCatalogos'
import { usePermisos } from '../../sesion/Sesion'
import { formatoFechaHora, formatoFechaTexto, formatoHora, partesFecha } from '../../utilidades/formato'

export function DetalleTurno() {
  const id = Number(useParams().id)
  const carga = useCarga(() => turnosApi.obtener(id), [id])
  return (
    <Recurso carga={carga} textoCargando="Cargando turno...">
      {(turno) => <Contenido turno={turno} alCambiar={carga.recargar} />}
    </Recurso>
  )
}

function Contenido({ turno, alCambiar }: { turno: Turno; alCambiar: () => void }) {
  const catalogos = useCatalogos()
  const { esAdministrativo, esMedico, esPersonal, esPaciente } = usePermisos()
  const notificar = useNotificar()
  const navegar = useNavigate()
  const [error, setError] = useState<unknown>(null)
  // Las consultas son datos clínicos: solo un médico consulta si el turno ya tiene una.
  const consulta = useCarga<Consulta[] | null>(
    () => (esMedico ? consultasApi.listar({ turnoId: turno.id }) : Promise.resolve(null)),
    [turno.id, turno.estado, esMedico])

  const ejecutar = (accion: () => Promise<unknown>, mensaje: string, despues: () => void) => async () => {
    setError(null)
    try {
      await accion()
      notificar(mensaje)
      despues()
    } catch (e) {
      setError(e)
    }
  }

  const consultaExistente = consulta.datos?.[0]
  const puedeRegistrarConsulta = esMedico && turno.estado !== 'CANCELADO' && consulta.datos != null && !consultaExistente
  const p = partesFecha(turno.fechaHora)
  const paciente = nombrePaciente(catalogos, turno.pacienteId)
  const medico = nombreMedico(catalogos, turno.medicoId)

  return (
    <>
      <EncabezadoPagina titulo={`Turno del ${formatoFechaTexto(turno.fechaHora)}`} icono="calendario"
        migas={[{ texto: esPaciente ? 'Mis turnos' : 'Turnos', a: '/turnos' }]}
        descripcion={`${formatoHora(turno.fechaHora)} a ${formatoHora(turno.fechaHoraFin)} hs · ${turno.duracionMinutos} minutos`}
        acciones={<>
          {esAdministrativo && turno.estado === 'PROGRAMADO' && (
            <Link to={`/turnos/${turno.id}/editar`} className="boton boton-secundario"><Icono nombre="editar" tamano={18} />Editar</Link>
          )}
          {puedeRegistrarConsulta && (
            <Link to={`/consultas/nueva?turnoId=${turno.id}`} className="boton boton-primario"><Icono nombre="consulta" tamano={18} />Registrar consulta</Link>
          )}
          {consultaExistente && (
            <Link to={`/consultas/${consultaExistente.id}`} className="boton boton-secundario"><Icono nombre="consulta" tamano={18} />Ver consulta</Link>
          )}
          {turno.estado === 'PROGRAMADO' && (
            <BotonConfirmar texto="Cancelar turno" icono="cancelar" peligroso pregunta="¿Cancelar este turno? El horario quedará libre."
              alConfirmar={ejecutar(() => turnosApi.cancelar(turno.id), 'Turno cancelado. El horario quedó libre.', alCambiar)} />
          )}
          {esAdministrativo && turno.estado === 'CANCELADO' && (
            <BotonConfirmar texto="Eliminar" icono="papelera" peligroso pregunta="¿Eliminar definitivamente este turno cancelado?"
              alConfirmar={ejecutar(() => turnosApi.eliminar(turno.id), 'Turno eliminado', () => navegar('/turnos'))} />
          )}
        </>} />
      {error ? <MensajeError error={error} /> : null}
      <Avisos avisos={catalogos.avisos} />

      <section className="ticket">
        <div className="ticket-cabecera">
          <div className="dia-grande" aria-hidden="true"><span>{p.dia}</span><strong>{p.numero}</strong><small>{p.mes}</small></div>
          <div>
            <h2>{nombreEspecialidad(catalogos, turno.especialidadId)}</h2>
            <p>{formatoFechaTexto(turno.fechaHora, true)} · {formatoHora(turno.fechaHora)} hs</p>
          </div>
          <span style={{ marginLeft: 'auto' }}><InsigniaTurno estado={turno.estado} /></span>
        </div>
        <div className="ticket-cuerpo">
          <dl className="datos">
            <Dato etiqueta="Paciente">
              <Persona nombre={paciente} tamano="chico" a={esPersonal ? `/pacientes/${turno.pacienteId}` : undefined} />
            </Dato>
            <Dato etiqueta="Profesional">
              <Persona nombre={medico} tamano="chico" a={esPersonal ? `/medicos/${turno.medicoId}` : undefined} />
            </Dato>
            <Dato etiqueta="Motivo">{turno.motivo}</Dato>
            <Dato etiqueta="Reservado el">{formatoFechaHora(turno.creadoEn)}</Dato>
          </dl>
        </div>
      </section>

      {turno.estado === 'CANCELADO' && (
        <Alerta tipo="info" titulo="Turno cancelado">El turno no se borra: queda registrado y el horario quedó libre para otra persona.</Alerta>
      )}
      {turno.estado === 'ATENDIDO' && !esMedico && (
        <Alerta tipo="exito" titulo="Turno atendido">La atención de este turno ya fue registrada.</Alerta>
      )}
      {turno.estado === 'PROGRAMADO' && esPaciente && (
        <Alerta tipo="info" titulo="¿No vas a poder asistir?">Cancelá el turno con el botón "Cancelar turno" para que otra persona pueda usar el horario.</Alerta>
      )}
      {consulta.error ? (
        <Alerta tipo="advertencia">No se pudo verificar si el turno tiene una consulta registrada (servicio de consultas no disponible).</Alerta>
      ) : null}
    </>
  )
}
