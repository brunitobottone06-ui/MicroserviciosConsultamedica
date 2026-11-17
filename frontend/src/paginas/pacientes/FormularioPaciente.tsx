import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { pacientesApi } from '../../api/servicios'
import type { PacienteDatos } from '../../api/tipos'
import { Cargando, MensajeError } from '../../componentes/Estados'
import { Campo, ErrorFormulario, SeccionFormulario, erroresDelServidor } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { EncabezadoPagina } from '../../componentes/Varios'
import { hoyIso } from '../../utilidades/formato'
import { hayErrores, sinError, validarPaciente, type Errores } from '../../utilidades/validaciones'

const VACIO: PacienteDatos = { nombre: '', apellido: '', dni: '', fechaNacimiento: '', email: '', telefono: '', obraSocial: '' }

export function FormularioPaciente() {
  const { id } = useParams()
  const edicion = id !== undefined
  const navegar = useNavigate()
  const notificar = useNotificar()

  const [datos, setDatos] = useState<PacienteDatos>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<unknown>(null)
  const [errorCarga, setErrorCarga] = useState<unknown>(null)
  const [cargando, setCargando] = useState(edicion)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!edicion) return
    pacientesApi.obtener(Number(id))
      .then((p) => setDatos({
        nombre: p.nombre, apellido: p.apellido, dni: p.dni, fechaNacimiento: p.fechaNacimiento,
        email: p.email ?? '', telefono: p.telefono ?? '', obraSocial: p.obraSocial ?? '',
      }))
      .catch(setErrorCarga)
      .finally(() => setCargando(false))
  }, [edicion, id])

  const cambiar = (campo: keyof PacienteDatos) => (valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((actuales) => sinError(actuales, campo))
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const encontrados = validarPaciente(datos)
    setErrores(encontrados)
    if (hayErrores(encontrados)) return

    setGuardando(true)
    try {
      const datosLimpios = { ...datos, dni: datos.dni.trim() }
      const paciente = edicion
        ? await pacientesApi.actualizar(Number(id), datosLimpios)
        : await pacientesApi.crear(datosLimpios)
      notificar(edicion ? 'Datos del paciente actualizados' : `Paciente ${paciente.nombre} ${paciente.apellido} registrado`)
      navegar(`/pacientes/${paciente.id}`)
    } catch (error) {
      setErrores(erroresDelServidor(error))
      setErrorGeneral(error)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando paciente..." />
  if (errorCarga) return <MensajeError error={errorCarga} />

  return (
    <>
      <EncabezadoPagina titulo={edicion ? 'Editar paciente' : 'Nuevo paciente'} icono="pacientes"
        migas={[{ texto: 'Pacientes', a: '/pacientes' }]} descripcion="Los campos marcados con * son obligatorios." />
      <form className="formulario" onSubmit={guardar} noValidate>
        <ErrorFormulario error={errorGeneral} />
        <SeccionFormulario numero={1} titulo="Datos personales" descripcion="Tal como figuran en el documento.">
          <div className="grilla-campos">
            <Campo etiqueta="Nombre" obligatorio error={errores.nombre}>
              {(p) => <input {...p} value={datos.nombre} onChange={(e) => cambiar('nombre')(e.target.value)} maxLength={80} autoFocus autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Apellido" obligatorio error={errores.apellido}>
              {(p) => <input {...p} value={datos.apellido} onChange={(e) => cambiar('apellido')(e.target.value)} maxLength={80} autoComplete="off" />}
            </Campo>
            <Campo etiqueta="DNI" obligatorio error={errores.dni} ayuda="Solo números, sin puntos.">
              {(p) => <input {...p} value={datos.dni} inputMode="numeric" onChange={(e) => cambiar('dni')(e.target.value)} maxLength={8} autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Fecha de nacimiento" obligatorio error={errores.fechaNacimiento}>
              {(p) => <input {...p} type="date" value={datos.fechaNacimiento} max={hoyIso()}
                onChange={(e) => cambiar('fechaNacimiento')(e.target.value)} />}
            </Campo>
          </div>
        </SeccionFormulario>
        <SeccionFormulario numero={2} titulo="Contacto y cobertura" descripcion="Opcional, pero útil para avisos sobre los turnos.">
          <div className="grilla-campos">
            <Campo etiqueta="Email" error={errores.email}>
              {(p) => <input {...p} type="email" value={datos.email} onChange={(e) => cambiar('email')(e.target.value)} maxLength={120} autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Teléfono" error={errores.telefono}>
              {(p) => <input {...p} type="tel" value={datos.telefono} onChange={(e) => cambiar('telefono')(e.target.value)} maxLength={30} autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Obra social" error={errores.obraSocial}>
              {(p) => <input {...p} value={datos.obraSocial} onChange={(e) => cambiar('obraSocial')(e.target.value)} maxLength={100} />}
            </Campo>
          </div>
        </SeccionFormulario>
        <div className="barra-acciones">
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="check" tamano={18} />{guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <Link to={edicion ? `/pacientes/${id}` : '/pacientes'} className="boton boton-secundario">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
