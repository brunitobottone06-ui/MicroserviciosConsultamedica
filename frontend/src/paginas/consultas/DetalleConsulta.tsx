import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { consultasApi } from '../../api/servicios'
import { Avisos, MensajeError, Recurso } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { BotonConfirmar, Dato, EncabezadoPagina, Persona } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { nombreEspecialidad, nombreMedico, nombrePaciente, useCatalogos } from '../../hooks/useCatalogos'
import { formatoFechaHora, formatoFechaTexto, formatoHora } from '../../utilidades/formato'

export function DetalleConsulta() {
  const id = Number(useParams().id)
  const carga = useCarga(() => consultasApi.obtener(id), [id])
  const catalogos = useCatalogos()
  const notificar = useNotificar()
  const navegar = useNavigate()
  const [error, setError] = useState<unknown>(null)

  return (
    <Recurso carga={carga} textoCargando="Cargando consulta...">
      {(c) => (
        <>
          <EncabezadoPagina titulo={`Consulta del ${formatoFechaTexto(c.fechaTurno)}`} icono="consulta"
            migas={[{ texto: 'Consultas', a: '/consultas' }]}
            descripcion={`${formatoHora(c.fechaTurno)} hs · ${nombreEspecialidad(catalogos, c.especialidadId)}`}
            acciones={<>
              <Link to={`/consultas/${c.id}/editar`} className="boton boton-secundario"><Icono nombre="editar" tamano={18} />Editar</Link>
              <BotonConfirmar texto="Eliminar" icono="papelera" peligroso
                pregunta="¿Eliminar la consulta? El turno seguirá figurando como atendido."
                alConfirmar={async () => {
                  setError(null)
                  try {
                    await consultasApi.eliminar(c.id)
                    notificar('Consulta eliminada')
                    navegar('/consultas')
                  } catch (e) {
                    setError(e)
                  }
                }} />
            </>} />
          {error ? <MensajeError error={error} /> : null}
          <Avisos avisos={catalogos.avisos} />

          <div className="grilla-panel">
            <section className="tarjeta">
              <div className="tarjeta-titulo"><h2><Icono nombre="consulta" />Registro clínico</h2></div>
              <dl className="datos datos-largos">
                <Dato etiqueta="Motivo de consulta">{c.motivo}</Dato>
                <Dato etiqueta="Diagnóstico">{c.diagnostico}</Dato>
                <Dato etiqueta="Tratamiento / indicaciones">{c.tratamiento}</Dato>
                <Dato etiqueta="Observaciones">{c.observaciones}</Dato>
              </dl>
            </section>
            <section className="tarjeta">
              <div className="tarjeta-titulo"><h2><Icono nombre="info" />Datos de la atención</h2></div>
              <dl className="datos datos-largos">
                <Dato etiqueta="Paciente"><Persona nombre={nombrePaciente(catalogos, c.pacienteId)} a={`/pacientes/${c.pacienteId}`} tamano="chico" /></Dato>
                <Dato etiqueta="Profesional"><Persona nombre={nombreMedico(catalogos, c.medicoId)} tamano="chico" /></Dato>
                <Dato etiqueta="Turno"><Link to={`/turnos/${c.turnoId}`}>Ver turno del {formatoFechaHora(c.fechaTurno)}</Link></Dato>
                <Dato etiqueta="Registrada">{formatoFechaHora(c.registradaEn)}</Dato>
              </dl>
            </section>
          </div>
        </>
      )}
    </Recurso>
  )
}
