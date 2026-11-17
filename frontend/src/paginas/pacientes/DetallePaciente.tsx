import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { consultasApi, pacientesApi, turnosApi } from '../../api/servicios'
import type { Paciente } from '../../api/tipos'
import { Avisos, MensajeError, Recurso, Vacio } from '../../componentes/Estados'
import { CampoClave, ErrorFormulario } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { Avatar, BotonConfirmar, Dato, EncabezadoPagina, InsigniaActivo, InsigniaTurno } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { nombreEspecialidad, nombreMedico, useCatalogos } from '../../hooks/useCatalogos'
import { usePermisos } from '../../sesion/Sesion'
import { edad, formatoFecha, formatoFechaHora } from '../../utilidades/formato'

export function DetallePaciente() {
  const id = Number(useParams().id)
  const carga = useCarga(() => pacientesApi.obtener(id), [id])

  return (
    <Recurso carga={carga} textoCargando="Cargando paciente...">
      {(paciente) => <Contenido paciente={paciente} alCambiar={carga.recargar} />}
    </Recurso>
  )
}

function Contenido({ paciente, alCambiar }: { paciente: Paciente; alCambiar: () => void }) {
  const notificar = useNotificar()
  const { esAdministrativo, esMedico } = usePermisos()
  const [error, setError] = useState<unknown>(null)

  const cambiarEstado = async () => {
    setError(null)
    try {
      if (paciente.activo) await pacientesApi.darDeBaja(paciente.id)
      else await pacientesApi.reactivar(paciente.id)
      notificar(paciente.activo ? 'Paciente dado de baja' : 'Paciente reactivado')
      alCambiar()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Ficha del paciente" migas={[{ texto: 'Pacientes', a: '/pacientes' }]}
        acciones={<>
          {paciente.activo && (
            <Link to={`/turnos/nuevo?pacienteId=${paciente.id}`} className="boton boton-primario"><Icono nombre="calendarioMas" tamano={18} />Nuevo turno</Link>
          )}
          {esAdministrativo && <>
            <Link to={`/pacientes/${paciente.id}/editar`} className="boton boton-secundario"><Icono nombre="editar" tamano={18} />Editar</Link>
            <BotonConfirmar texto={paciente.activo ? 'Dar de baja' : 'Reactivar'} peligroso={paciente.activo} icono={paciente.activo ? 'cancelar' : 'refrescar'}
              pregunta={paciente.activo ? '¿Dar de baja al paciente? No podrá recibir turnos nuevos ni iniciar sesión.' : '¿Reactivar al paciente?'}
              alConfirmar={cambiarEstado} />
          </>}
        </>} />
      {error ? <MensajeError error={error} /> : null}

      <section className="tarjeta">
        <div className="perfil">
          <Avatar nombre={`${paciente.nombre} ${paciente.apellido}`} tamano="grande" />
          <div className="perfil-texto">
            <h1>{paciente.apellido}, {paciente.nombre}</h1>
            <div className="perfil-meta">
              <span><Icono nombre="documento" tamano={16} />DNI {paciente.dni}</span>
              <span><Icono nombre="calendario" tamano={16} />{formatoFecha(paciente.fechaNacimiento)} ({edad(paciente.fechaNacimiento)} años)</span>
              <InsigniaActivo activo={paciente.activo} />
            </div>
          </div>
        </div>
        <dl className="datos" style={{ marginTop: '1.4rem' }}>
          <Dato etiqueta="Email">{paciente.email}</Dato>
          <Dato etiqueta="Teléfono">{paciente.telefono}</Dato>
          <Dato etiqueta="Obra social">{paciente.obraSocial}</Dato>
        </dl>
      </section>

      {esAdministrativo && paciente.activo && <HabilitarAcceso paciente={paciente} />}

      <div className={esMedico ? 'grilla-2' : ''}>
        <TurnosDelPaciente pacienteId={paciente.id} />
        {/* Historial clínico: solo para médicos */}
        {esMedico && <ConsultasDelPaciente pacienteId={paciente.id} />}
      </div>
    </>
  )
}

/** Recepción crea la cuenta web de un paciente ya cargado: su usuario será su DNI. */
function HabilitarAcceso({ paciente }: { paciente: Paciente }) {
  const notificar = useNotificar()
  const [abierto, setAbierto] = useState(false)
  const [clave, setClave] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [errorClave, setErrorClave] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const habilitar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (clave.length < 8 || clave.length > 72) {
      setErrorClave('La contraseña debe tener entre 8 y 72 caracteres')
      return
    }
    setEnviando(true)
    try {
      await pacientesApi.habilitarAcceso(paciente.id, clave)
      notificar(`Acceso habilitado. Usuario: ${paciente.dni}`)
      setAbierto(false)
      setClave('')
    } catch (err) {
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) {
    return (
      <div className="alerta alerta-info">
        <Icono nombre="candado" />
        <div className="alerta-cuerpo">
          <strong>Acceso web del paciente</strong>
          <p>Si el paciente todavía no tiene cuenta, podés habilitarle el acceso para que pida y consulte sus turnos.</p>
          <button type="button" className="boton boton-secundario boton-chico" onClick={() => setAbierto(true)}>Habilitar acceso web</button>
        </div>
      </div>
    )
  }
  return (
    <form className="tarjeta" onSubmit={habilitar} noValidate>
      <div className="tarjeta-titulo"><h2><Icono nombre="candado" />Habilitar acceso web</h2></div>
      <p className="texto-suave" style={{ marginBottom: '1rem' }}>
        El paciente va a iniciar sesión con su DNI (<strong>{paciente.dni}</strong>) y esta contraseña inicial.
      </p>
      <ErrorFormulario error={error} titulo="No se pudo habilitar el acceso" />
      <div style={{ maxWidth: 360 }}>
        <CampoClave etiqueta="Contraseña inicial" obligatorio error={errorClave} autoComplete="new-password"
          ayuda="Mínimo 8 caracteres. Comunicásela al paciente." valor={clave}
          alCambiar={(v) => { setClave(v); setErrorClave(undefined) }} />
      </div>
      <div className="acciones" style={{ marginTop: '1rem' }}>
        <button type="submit" className="boton boton-primario" disabled={enviando}>{enviando ? 'Habilitando...' : 'Habilitar acceso'}</button>
        <button type="button" className="boton boton-secundario" onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </form>
  )
}

/** Cada sección carga de un microservicio distinto: si uno falla, la otra igual se muestra. */
function TurnosDelPaciente({ pacienteId }: { pacienteId: number }) {
  const carga = useCarga(() => turnosApi.listar({ pacienteId }), [pacienteId])
  const catalogos = useCatalogos()
  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo"><h2><Icono nombre="calendario" />Turnos</h2></div>
      <Avisos avisos={catalogos.avisos} />
      <Recurso carga={carga} textoCargando="Cargando turnos...">
        {(turnos) => turnos.length === 0 ? <Vacio icono="calendario">Este paciente todavía no tiene turnos.</Vacio> : (
          <ul className="lista-simple">
            {[...turnos].reverse().map((t) => (
              <li key={t.id}>
                <Link to={`/turnos/${t.id}`} className="numero">{formatoFechaHora(t.fechaHora)}</Link>
                <span className="texto-suave">{nombreEspecialidad(catalogos, t.especialidadId)} · {nombreMedico(catalogos, t.medicoId)}</span>
                <span style={{ marginLeft: 'auto' }}><InsigniaTurno estado={t.estado} /></span>
              </li>
            ))}
          </ul>
        )}
      </Recurso>
    </section>
  )
}

function ConsultasDelPaciente({ pacienteId }: { pacienteId: number }) {
  const carga = useCarga(() => consultasApi.listar({ pacienteId }), [pacienteId])
  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo"><h2><Icono nombre="consulta" />Historial de consultas</h2></div>
      <Recurso carga={carga} textoCargando="Cargando consultas...">
        {(consultas) => consultas.length === 0 ? <Vacio icono="consulta">Sin consultas registradas.</Vacio> : (
          <ul className="lista-simple">
            {consultas.map((c) => (
              <li key={c.id}>
                <Link to={`/consultas/${c.id}`} className="numero">{formatoFechaHora(c.fechaTurno)}</Link>
                <span className="texto-suave texto-recortado">{c.motivo}</span>
              </li>
            ))}
          </ul>
        )}
      </Recurso>
    </section>
  )
}
