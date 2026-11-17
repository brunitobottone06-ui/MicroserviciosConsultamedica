import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import type { PacienteDatos } from '../../api/tipos'
import { Campo, CampoClave, ErrorFormulario, erroresDelServidor } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { useSesion } from '../../sesion/Sesion'
import { hoyIso } from '../../utilidades/formato'
import { hayErrores, sinError, validarPaciente, type Errores } from '../../utilidades/validaciones'
import { PantallaAcceso } from './PanelMarca'

const VACIO: PacienteDatos = { nombre: '', apellido: '', dni: '', fechaNacimiento: '', email: '', telefono: '', obraSocial: '' }

/** Registro de pacientes nuevos. Su usuario será su DNI. */
export function CrearCuenta() {
  const { usuario, registrarse } = useSesion()
  const navegar = useNavigate()
  const notificar = useNotificar()
  const [datos, setDatos] = useState<PacienteDatos>(VACIO)
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [error, setError] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  const cambiar = (campo: keyof PacienteDatos, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((a) => sinError(a, campo))
  }

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const encontrados = validarPaciente(datos)
    if (clave.length < 8 || clave.length > 72) encontrados.clave = 'La contraseña debe tener entre 8 y 72 caracteres'
    if (repetir !== clave) encontrados.repetir = 'Las contraseñas no coinciden'
    setErrores(encontrados)
    if (hayErrores(encontrados)) return
    setEnviando(true)
    try {
      await registrarse({ ...datos, dni: datos.dni.trim() }, clave)
      notificar('¡Cuenta creada! Ya podés pedir turnos.')
      navegar('/', { replace: true })
    } catch (err) {
      // El backend informa los errores de los datos personales como "paciente.campo"
      const delServidor = erroresDelServidor(err)
      setErrores(Object.fromEntries(Object.entries(delServidor).map(([k, v]) => [k.replace(/^paciente\./, ''), v])))
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso ancha>
      <h1>Crear cuenta de paciente</h1>
      <p>Tu usuario va a ser tu DNI. Los campos marcados con * son obligatorios.</p>
      <form onSubmit={crear} noValidate>
        <ErrorFormulario error={error} titulo="No se pudo crear la cuenta" />
        <div className="grilla-campos">
          <Campo etiqueta="Nombre" obligatorio error={errores.nombre}>
            {(p) => <input {...p} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} maxLength={80} autoFocus autoComplete="given-name" />}
          </Campo>
          <Campo etiqueta="Apellido" obligatorio error={errores.apellido}>
            {(p) => <input {...p} value={datos.apellido} onChange={(e) => cambiar('apellido', e.target.value)} maxLength={80} autoComplete="family-name" />}
          </Campo>
          <Campo etiqueta="DNI" obligatorio error={errores.dni} ayuda="Solo números, sin puntos. Será tu usuario.">
            {(p) => <input {...p} value={datos.dni} inputMode="numeric" onChange={(e) => cambiar('dni', e.target.value)} maxLength={8} autoComplete="username" />}
          </Campo>
          <Campo etiqueta="Fecha de nacimiento" obligatorio error={errores.fechaNacimiento}>
            {(p) => <input {...p} type="date" max={hoyIso()} value={datos.fechaNacimiento} onChange={(e) => cambiar('fechaNacimiento', e.target.value)} autoComplete="bday" />}
          </Campo>
          <Campo etiqueta="Email" error={errores.email}>
            {(p) => <input {...p} type="email" value={datos.email} onChange={(e) => cambiar('email', e.target.value)} maxLength={120} autoComplete="email" />}
          </Campo>
          <Campo etiqueta="Teléfono" error={errores.telefono}>
            {(p) => <input {...p} type="tel" value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} maxLength={30} autoComplete="tel" />}
          </Campo>
          <Campo etiqueta="Obra social" error={errores.obraSocial}>
            {(p) => <input {...p} value={datos.obraSocial} onChange={(e) => cambiar('obraSocial', e.target.value)} maxLength={100} />}
          </Campo>
        </div>
        <div className="grilla-campos">
          <CampoClave etiqueta="Contraseña" obligatorio error={errores.clave} ayuda="Mínimo 8 caracteres." valor={clave}
            autoComplete="new-password" alCambiar={(v) => { setClave(v); setErrores((a) => sinError(a, 'clave')) }} />
          <CampoClave etiqueta="Repetir contraseña" obligatorio error={errores.repetir} valor={repetir}
            autoComplete="new-password" alCambiar={(v) => { setRepetir(v); setErrores((a) => sinError(a, 'repetir')) }} />
        </div>
        <div className="acciones" style={{ marginTop: '0.75rem' }}>
          <button type="submit" className="boton boton-primario boton-grande" disabled={enviando}>
            <Icono nombre="check" tamano={18} />{enviando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <Link to="/login" className="boton boton-secundario boton-grande">Ya tengo cuenta</Link>
        </div>
      </form>
    </PantallaAcceso>
  )
}
