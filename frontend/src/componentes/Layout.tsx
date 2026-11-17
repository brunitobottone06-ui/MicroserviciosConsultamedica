import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { NOMBRE_ROL, type Rol } from '../sesion/almacen'
import { useSesion } from '../sesion/Sesion'
import { formatoFechaTexto, hoyIso } from '../utilidades/formato'
import { Icono, type NombreIcono } from './Icono'
import { Avatar } from './Varios'

interface Seccion {
  ruta: string
  texto: string
  icono: NombreIcono
  exacta?: boolean
}

interface Grupo {
  titulo: string
  secciones: Seccion[]
}

/** Menú según el rol: cada usuario ve solo lo que puede usar. */
const MENU: Record<Rol, Grupo[]> = {
  ADMINISTRATIVO: [
    { titulo: 'General', secciones: [{ ruta: '/', texto: 'Panel', icono: 'inicio', exacta: true }, { ruta: '/turnos', texto: 'Turnos', icono: 'calendario' }] },
    {
      titulo: 'Gestión', secciones: [
        { ruta: '/pacientes', texto: 'Pacientes', icono: 'pacientes' },
        { ruta: '/medicos', texto: 'Médicos', icono: 'medico' },
        { ruta: '/especialidades', texto: 'Especialidades', icono: 'especialidad' },
        { ruta: '/usuarios', texto: 'Usuarios', icono: 'escudo' },
      ],
    },
    { titulo: 'Ayuda', secciones: [{ ruta: '/asistente', texto: 'Asistente', icono: 'asistente' }] },
  ],
  MEDICO: [
    { titulo: 'General', secciones: [{ ruta: '/', texto: 'Panel', icono: 'inicio', exacta: true }, { ruta: '/turnos', texto: 'Turnos', icono: 'calendario' }] },
    { titulo: 'Clínica', secciones: [{ ruta: '/consultas', texto: 'Consultas', icono: 'consulta' }, { ruta: '/pacientes', texto: 'Pacientes', icono: 'pacientes' }] },
    { titulo: 'Consultorio', secciones: [{ ruta: '/medicos', texto: 'Médicos', icono: 'medico' }, { ruta: '/especialidades', texto: 'Especialidades', icono: 'especialidad' }] },
    { titulo: 'Ayuda', secciones: [{ ruta: '/asistente', texto: 'Asistente', icono: 'asistente' }] },
  ],
  PACIENTE: [
    {
      titulo: 'Mi espacio', secciones: [
        { ruta: '/', texto: 'Inicio', icono: 'inicio', exacta: true },
        { ruta: '/turnos/nuevo', texto: 'Pedir turno', icono: 'calendarioMas' },
        { ruta: '/turnos', texto: 'Mis turnos', icono: 'calendario', exacta: true },
        { ruta: '/mis-datos', texto: 'Mis datos', icono: 'usuario' },
      ],
    },
    { titulo: 'Ayuda', secciones: [{ ruta: '/asistente', texto: 'Asistente', icono: 'asistente' }] },
  ],
}

export function Layout() {
  const { usuario, cerrarSesion } = useSesion()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [rutaAnterior, setRutaAnterior] = useState(pathname)

  // Al cambiar de sección: se cierra el menú móvil y se vuelve al comienzo de la página
  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname)
    setMenuAbierto(false)
  }
  useEffect(() => {
    try {
      window.scrollTo({ top: 0 })
    } catch {
      // entornos sin scroll (pruebas)
    }
  }, [pathname])

  // Escape cierra el menú móvil
  useEffect(() => {
    if (!menuAbierto) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false)
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [menuAbierto])

  if (!usuario) return null

  const salir = () => {
    cerrarSesion('Cerraste la sesión. ¡Hasta pronto!')
    navegar('/login', { replace: true })
  }
  const esPaciente = usuario.rol === 'PACIENTE'

  return (
    <div className="app">
      <a href="#contenido" className="saltar">Saltar al contenido</a>

      <aside id="menu-lateral" className={`lateral ${menuAbierto ? 'abierta' : ''}`} aria-label="Menú principal">
        <Link to="/" className="marca" aria-label="Consultorio — ir al inicio">
          <span className="marca-logo"><Icono nombre="cruz" tamano={22} /></span>
          <span className="marca-texto"><strong>Consultorio</strong><small>Atención y turnos</small></span>
        </Link>

        {MENU[usuario.rol].map((grupo) => (
          <nav key={grupo.titulo} aria-label={grupo.titulo}>
            <p className="nav-titulo">{grupo.titulo}</p>
            <div className="nav">
              {grupo.secciones.map((s) => (
                <NavLink key={s.ruta} to={s.ruta} end={s.exacta} title={s.texto}
                  className={({ isActive }) => `nav-enlace ${isActive ? 'activo' : ''}`}>
                  <Icono nombre={s.icono} />
                  <span>{s.texto}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        ))}

        <div className="lateral-pie">
          <div className="tarjeta-perfil" title={`${usuario.nombre} · ${NOMBRE_ROL[usuario.rol]}`}>
            <Avatar nombre={usuario.nombre} />
            <div>
              <strong>{usuario.nombre}</strong>
              <small>{NOMBRE_ROL[usuario.rol]} · {usuario.usuario}</small>
            </div>
          </div>
          <button type="button" className="boton-salir" onClick={salir} title="Cerrar sesión">
            <Icono nombre="salir" tamano={18} /><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <div className="velo" hidden={!menuAbierto} onClick={() => setMenuAbierto(false)} />

      <div className="principal">
        <header className="superior">
          <button type="button" className="boton boton-secundario boton-icono boton-menu" onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú" aria-expanded={menuAbierto} aria-controls="menu-lateral">
            <Icono nombre="menu" />
          </button>
          <p className="superior-fecha">Hoy es <strong>{formatoFechaTexto(hoyIso())}</strong></p>
          <div className="superior-derecha">
            {/* Acceso rápido, salvo en las pantallas que ya tienen su propio botón de reserva */}
            {!['/', '/turnos', '/turnos/nuevo'].includes(pathname) && (
              <Link to="/turnos/nuevo" className="boton boton-primario">
                <Icono nombre="calendarioMas" tamano={18} />{esPaciente ? 'Pedir turno' : 'Nuevo turno'}
              </Link>
            )}
          </div>
        </header>
        <main id="contenido" className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
