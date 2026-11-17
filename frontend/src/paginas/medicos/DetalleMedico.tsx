import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { especialidadesApi, medicosApi, turnosApi } from '../../api/servicios'
import type { Medico } from '../../api/tipos'
import { Avisos, MensajeError, Recurso, Vacio } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { Avatar, BotonConfirmar, EncabezadoPagina, Insignia, InsigniaActivo, InsigniaTurno } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { nombreEspecialidad, nombrePaciente, useCatalogos } from '../../hooks/useCatalogos'
import { formatoFechaHora, hoyIso } from '../../utilidades/formato'
import { usePermisos } from '../../sesion/Sesion'

export function DetalleMedico() {
  const id = Number(useParams().id)
  const carga = useCarga(() => medicosApi.obtener(id), [id])
  return (
    <Recurso carga={carga} textoCargando="Cargando médico...">
      {(medico) => <Contenido medico={medico} alCambiar={carga.recargar} />}
    </Recurso>
  )
}

function Contenido({ medico, alCambiar }: { medico: Medico; alCambiar: () => void }) {
  const { esAdministrativo } = usePermisos()
  const notificar = useNotificar()
  const [error, setError] = useState<unknown>(null)
  const especialidades = useCarga(() => especialidadesApi.listar({ incluirInactivas: true }), [])

  const cambiarEstado = async () => {
    setError(null)
    try {
      if (medico.activo) await medicosApi.darDeBaja(medico.id)
      else await medicosApi.reactivar(medico.id)
      notificar(medico.activo ? 'Médico dado de baja' : 'Médico reactivado')
      alCambiar()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Ficha del profesional" migas={[{ texto: 'Médicos', a: '/medicos' }]}
        acciones={esAdministrativo ? <>
          <Link to={`/medicos/${medico.id}/editar`} className="boton boton-secundario"><Icono nombre="editar" tamano={18} />Editar</Link>
          <BotonConfirmar texto={medico.activo ? 'Dar de baja' : 'Reactivar'} peligroso={medico.activo} icono={medico.activo ? 'cancelar' : 'refrescar'}
            pregunta={medico.activo ? '¿Dar de baja al médico? No podrá recibir turnos nuevos.' : '¿Reactivar al médico?'}
            alConfirmar={cambiarEstado} />
        </> : undefined} />
      {error ? <MensajeError error={error} /> : null}

      <section className="tarjeta">
        <div className="perfil">
          <Avatar nombre={`${medico.nombre} ${medico.apellido}`} tamano="grande" />
          <div className="perfil-texto">
            <h1>{medico.apellido}, {medico.nombre}</h1>
            <div className="perfil-meta">
              <span><Icono nombre="documento" tamano={16} />Matrícula {medico.matricula}</span>
              {medico.telefono && <span><Icono nombre="telefono" tamano={16} />{medico.telefono}</span>}
              {medico.email && <span><Icono nombre="email" tamano={16} />{medico.email}</span>}
              <InsigniaActivo activo={medico.activo} />
            </div>
            <div className="chips" style={{ marginTop: '0.75rem' }}>
              {medico.especialidadIds.map((id) => (
                <Insignia key={id} tipo="marca" sinPunto>
                  {especialidades.datos?.find((e) => e.id === id)?.nombre ?? `Especialidad #${id}`}
                </Insignia>
              ))}
            </div>
          </div>
        </div>
      </section>
      <ProximosTurnos medicoId={medico.id} />
    </>
  )
}

function ProximosTurnos({ medicoId }: { medicoId: number }) {
  const carga = useCarga(() => turnosApi.listar({ medicoId, desde: hoyIso(), estado: 'PROGRAMADO' }), [medicoId])
  const catalogos = useCatalogos()
  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo"><h2><Icono nombre="calendario" />Próximos turnos programados</h2></div>
      <Avisos avisos={catalogos.avisos} />
      <Recurso carga={carga} textoCargando="Cargando turnos...">
        {(turnos) => turnos.length === 0 ? <Vacio icono="calendario">No tiene turnos programados.</Vacio> : (
          <ul className="lista-simple">
            {turnos.map((t) => (
              <li key={t.id}>
                <Link to={`/turnos/${t.id}`} className="numero">{formatoFechaHora(t.fechaHora)}</Link>
                <span className="texto-suave">{nombrePaciente(catalogos, t.pacienteId)} · {nombreEspecialidad(catalogos, t.especialidadId)}</span>
                <span style={{ marginLeft: 'auto' }}><InsigniaTurno estado={t.estado} /></span>
              </li>
            ))}
          </ul>
        )}
      </Recurso>
    </section>
  )
}
