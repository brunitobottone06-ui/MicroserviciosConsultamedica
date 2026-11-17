import { Link } from 'react-router'
import { pacientesApi } from '../../api/servicios'
import { Alerta, Recurso } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { Avatar, Dato, EncabezadoPagina } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { usePermisos } from '../../sesion/Sesion'
import { edad, formatoFecha } from '../../utilidades/formato'

/** Datos personales del paciente que inició sesión (solo lectura: el backend no ofrece edición propia). */
export function MisDatos() {
  const { pacienteId } = usePermisos()
  const carga = useCarga(() => pacientesApi.obtener(pacienteId ?? 0), [pacienteId])
  return (
    <>
      <EncabezadoPagina titulo="Mis datos" icono="usuario" descripcion="La información que el consultorio tiene registrada sobre vos." />
      <Recurso carga={carga} textoCargando="Cargando tus datos...">
        {(p) => (
          <section className="tarjeta">
            <div className="perfil">
              <Avatar nombre={`${p.nombre} ${p.apellido}`} tamano="grande" />
              <div className="perfil-texto">
                <h1>{p.nombre} {p.apellido}</h1>
                <div className="perfil-meta">
                  <span><Icono nombre="documento" tamano={16} />DNI {p.dni} (tu usuario)</span>
                  <span><Icono nombre="calendario" tamano={16} />{formatoFecha(p.fechaNacimiento)} ({edad(p.fechaNacimiento)} años)</span>
                </div>
              </div>
            </div>
            <dl className="datos" style={{ marginTop: '1.4rem' }}>
              <Dato etiqueta="Email">{p.email}</Dato>
              <Dato etiqueta="Teléfono">{p.telefono}</Dato>
              <Dato etiqueta="Obra social">{p.obraSocial}</Dato>
            </dl>
          </section>
        )}
      </Recurso>
      <Alerta tipo="info" titulo="¿Algún dato es incorrecto?">
        <p>Por seguridad, tus datos personales los actualiza la recepción del consultorio. Comunicate con ellos para corregirlos.</p>
        <Link to="/turnos" className="boton boton-secundario boton-chico">Ver mis turnos</Link>
      </Alerta>
    </>
  )
}
