import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { configurarAutenticacion } from '../api/cliente'
import { authApi } from '../api/servicios'
import type { PacienteDatos } from '../api/tipos'
import { guardarSesion, leerSesion, type Rol, type Sesion, type UsuarioSesion } from './almacen'

interface ContextoSesion {
  usuario: UsuarioSesion | null
  /** Motivo por el que se cerró la sesión (por ejemplo, vencimiento), para mostrarlo en el login. */
  aviso: string | null
  iniciarSesion: (usuario: string, clave: string) => Promise<void>
  registrarse: (paciente: PacienteDatos, clave: string) => Promise<void>
  cerrarSesion: (aviso?: string) => void
}

const Contexto = createContext<ContextoSesion | null>(null)

export function ProveedorSesion({ children, inicial }: { children: ReactNode; inicial?: Sesion | null }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => (inicial !== undefined ? inicial : leerSesion()))
  const [aviso, setAviso] = useState<string | null>(null)
  const sesionRef = useRef(sesion)
  sesionRef.current = sesion

  const establecer = useCallback((nueva: Sesion | null, motivo: string | null = null) => {
    sesionRef.current = nueva
    guardarSesion(nueva)
    setSesion(nueva)
    setAviso(motivo)
  }, [])

  // El cliente HTTP toma el token de acá y, si el backend responde 401, se cierra la sesión.
  configurarAutenticacion({
    obtenerToken: () => sesionRef.current?.token ?? null,
    alExpirar: () => {
      if (sesionRef.current) establecer(null, 'Tu sesión expiró. Iniciá sesión nuevamente.')
    },
  })

  const valor = useMemo<ContextoSesion>(() => ({
    usuario: sesion?.usuario ?? null,
    aviso,
    iniciarSesion: async (usuario, clave) => establecer(await authApi.iniciarSesion(usuario, clave)),
    registrarse: async (paciente, clave) => establecer(await authApi.registrarse(paciente, clave)),
    cerrarSesion: (motivo) => establecer(null, motivo ?? null),
  }), [sesion, aviso, establecer])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return contexto
}

/** Atajos para mostrar u ocultar acciones según el rol. El backend vuelve a verificar SIEMPRE. */
export function usePermisos() {
  const { usuario } = useSesion()
  const rol = usuario?.rol
  return {
    rol,
    pacienteId: usuario?.pacienteId ?? null,
    esAdministrativo: rol === 'ADMINISTRATIVO',
    esMedico: rol === 'MEDICO',
    esPaciente: rol === 'PACIENTE',
    esPersonal: rol === 'ADMINISTRATIVO' || rol === 'MEDICO',
  }
}

/** Protege una ruta: sin sesión lleva al login; con un rol no permitido muestra un aviso. */
export function RutaProtegida({ children, roles }: { children: ReactNode; roles?: Rol[] }) {
  const { usuario } = useSesion()
  const ubicacion = useLocation()
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />
  }
  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div className="alerta alerta-advertencia" role="alert">
        <strong>Sin permiso</strong>
        <p>Tu usuario no tiene acceso a esta sección.</p>
      </div>
    )
  }
  return <>{children}</>
}
