import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Alerta } from '../../componentes/Estados'
import { Campo, CampoClave, ErrorFormulario } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useSesion } from '../../sesion/Sesion'
import { hayErrores, sinError, type Errores } from '../../utilidades/validaciones'
import { PantallaAcceso } from './PanelMarca'

export function IniciarSesion() {
  const { usuario: sesionActual, aviso, iniciarSesion } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'

  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [error, setError] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)

  if (sesionActual) return <Navigate to={destino} replace />

  const ingresar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const encontrados: Errores = {}
    if (!usuario.trim()) encontrados.usuario = 'Ingresá tu usuario'
    if (!clave) encontrados.clave = 'Ingresá tu contraseña'
    setErrores(encontrados)
    if (hayErrores(encontrados)) return
    setEnviando(true)
    try {
      await iniciarSesion(usuario.trim(), clave)
      navegar(destino, { replace: true })
    } catch (err) {
      setError(err)
      setClave('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso>
      <h1>Iniciar sesión</h1>
      <p>Ingresá con tu usuario y contraseña.</p>
      {aviso && <Alerta tipo="info">{aviso}</Alerta>}
      <form onSubmit={ingresar} noValidate style={{ marginTop: aviso ? '1rem' : 0 }}>
        <ErrorFormulario error={error} titulo="No se pudo iniciar sesión" />
        <Campo etiqueta="Usuario" error={errores.usuario} ayuda="Si sos paciente, tu usuario es tu DNI (sin puntos).">
          {(p) => <input {...p} value={usuario} autoComplete="username" autoFocus
            onChange={(e) => { setUsuario(e.target.value); setErrores((a) => sinError(a, 'usuario')) }} />}
        </Campo>
        <CampoClave etiqueta="Contraseña" error={errores.clave} valor={clave} autoComplete="current-password"
          alCambiar={(v) => { setClave(v); setErrores((a) => sinError(a, 'clave')) }} />
        <button type="submit" className="boton boton-primario boton-grande boton-ancho" disabled={enviando}>
          {enviando ? <><span className="spinner" aria-hidden="true" />Ingresando...</> : <>Ingresar<Icono nombre="derecha" tamano={18} /></>}
        </button>
      </form>
      <div className="separador">¿Es tu primera vez?</div>
      <Link to="/registro" className="boton boton-secundario boton-ancho">Crear cuenta</Link>
      <p className="texto-tenue" style={{ marginTop: '1.2rem' }}>
        Si ya te atendiste en el consultorio y no tenés cuenta, o si olvidaste tu contraseña, comunicate con la recepción.
      </p>
    </PantallaAcceso>
  )
}
