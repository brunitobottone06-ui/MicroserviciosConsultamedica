/**
 * Guarda la sesión (token + datos del usuario) en sessionStorage: dura mientras la pestaña esté
 * abierta y se borra al cerrarla. El token también tiene vencimiento propio (lo controla el backend).
 */
export type Rol = 'ADMINISTRATIVO' | 'MEDICO' | 'PACIENTE'

export interface UsuarioSesion {
  id: number
  usuario: string
  nombre: string
  rol: Rol
  pacienteId: number | null
  activo: boolean
}

export interface Sesion {
  token: string
  /** Fecha ISO de vencimiento del token. */
  expiraEn: string
  usuario: UsuarioSesion
}

const CLAVE = 'consultorio.sesion'

export function leerSesion(ahora: Date = new Date()): Sesion | null {
  try {
    const texto = sessionStorage.getItem(CLAVE)
    if (!texto) return null
    const sesion = JSON.parse(texto) as Sesion
    return new Date(sesion.expiraEn) > ahora ? sesion : null
  } catch {
    return null
  }
}

export function guardarSesion(sesion: Sesion | null) {
  try {
    if (sesion) sessionStorage.setItem(CLAVE, JSON.stringify(sesion))
    else sessionStorage.removeItem(CLAVE)
  } catch {
    // Almacenamiento no disponible (modo privado estricto): la sesión vive solo en memoria.
  }
}

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMINISTRATIVO: 'Administración',
  MEDICO: 'Médico/a',
  PACIENTE: 'Paciente',
}
