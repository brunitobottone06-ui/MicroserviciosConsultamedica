import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { especialidadesApi, medicosApi } from '../../api/servicios'
import type { Especialidad } from '../../api/tipos'
import { MensajeError, Recurso, Vacio } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { BotonConfirmar, EncabezadoPagina, InsigniaActivo, Persona } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { usePermisos } from '../../sesion/Sesion'

export function DetalleEspecialidad() {
  const id = Number(useParams().id)
  const carga = useCarga(() => especialidadesApi.obtener(id), [id])
  return (
    <Recurso carga={carga} textoCargando="Cargando especialidad...">
      {(esp) => <Contenido especialidad={esp} alCambiar={carga.recargar} />}
    </Recurso>
  )
}

function Contenido({ especialidad, alCambiar }: { especialidad: Especialidad; alCambiar: () => void }) {
  const { esAdministrativo } = usePermisos()
  const notificar = useNotificar()
  const [error, setError] = useState<unknown>(null)
  const medicos = useCarga(() => medicosApi.listar({ especialidadId: especialidad.id }), [especialidad.id])

  const cambiarEstado = async () => {
    setError(null)
    try {
      if (especialidad.activa) await especialidadesApi.darDeBaja(especialidad.id)
      else await especialidadesApi.reactivar(especialidad.id)
      notificar(especialidad.activa ? 'Especialidad dada de baja' : 'Especialidad reactivada')
      alCambiar()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Especialidad" migas={[{ texto: 'Especialidades', a: '/especialidades' }]}
        acciones={esAdministrativo ? <>
          <Link to={`/especialidades/${especialidad.id}/editar`} className="boton boton-secundario"><Icono nombre="editar" tamano={18} />Editar</Link>
          <BotonConfirmar texto={especialidad.activa ? 'Dar de baja' : 'Reactivar'} peligroso={especialidad.activa} icono={especialidad.activa ? 'cancelar' : 'refrescar'}
            pregunta={especialidad.activa ? '¿Dar de baja? No se podrán dar turnos nuevos de esta especialidad.' : '¿Reactivar la especialidad?'}
            alConfirmar={cambiarEstado} />
        </> : undefined} />
      {error ? <MensajeError error={error} /> : null}

      <section className="tarjeta">
        <div className="perfil">
          <span className="icono-especialidad" style={{ width: 64, height: 64, borderRadius: 20 }}><Icono nombre="especialidad" tamano={30} /></span>
          <div className="perfil-texto">
            <h1>{especialidad.nombre}</h1>
            <div className="perfil-meta"><InsigniaActivo activo={especialidad.activa} femenino /></div>
          </div>
        </div>
        <p className="texto-suave" style={{ marginTop: '1rem' }}>{especialidad.descripcion ?? 'Sin descripción.'}</p>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-titulo"><h2><Icono nombre="medico" />Médicos que la atienden</h2></div>
        <Recurso carga={medicos} textoCargando="Cargando médicos...">
          {(lista) => lista.length === 0 ? <Vacio icono="medico">Ningún médico activo atiende esta especialidad.</Vacio> : (
            <ul className="lista-simple">
              {lista.map((m) => (
                <li key={m.id}>
                  <Persona nombre={`${m.apellido}, ${m.nombre}`} a={`/medicos/${m.id}`} detalle={`Matrícula ${m.matricula}`} />
                </li>
              ))}
            </ul>
          )}
        </Recurso>
      </section>
    </>
  )
}
