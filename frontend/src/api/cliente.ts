/**
 * Cliente HTTP común a todo el frontend.
 *
 * Todas las rutas son relativas (/api/...): en desarrollo las atiende el proxy de Vite y en Docker
 * las atiende nginx, que las reenvía al microservicio correspondiente.
 *
 * Convierte cualquier falla en un ErrorApi con un mensaje comprensible:
 *  - sin conexión / servicio caído / proxy sin destino  -> "no-disponible" o "red"
 *  - 400 con errores por campo                          -> "validacion"
 *  - 404                                                 -> "no-encontrado"
 *  - 409 / 422 (reglas del negocio)                      -> "negocio"
 */

export type TipoError = 'red' | 'tiempo' | 'no-disponible' | 'validacion' | 'no-encontrado' | 'negocio'
  | 'sesion' | 'prohibido' | 'desconocido'

/**
 * Conexión con la sesión: el proveedor de sesión registra cómo obtener el token actual y qué hacer
 * cuando el backend responde 401 (token vencido o inválido).
 */
const autenticacion: { obtenerToken: () => string | null; alExpirar: () => void } = {
  obtenerToken: () => null,
  alExpirar: () => {},
}

export function configurarAutenticacion(opciones: { obtenerToken: () => string | null; alExpirar: () => void }) {
  autenticacion.obtenerToken = opciones.obtenerToken
  autenticacion.alExpirar = opciones.alExpirar
}

export class ErrorApi extends Error {
  readonly tipo: TipoError
  readonly estado?: number
  readonly errores: Record<string, string>
  readonly servicio?: string

  constructor(tipo: TipoError, mensaje: string, opciones: { estado?: number; errores?: Record<string, string>; servicio?: string } = {}) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.tipo = tipo
    this.estado = opciones.estado
    this.errores = opciones.errores ?? {}
    this.servicio = opciones.servicio
  }
}

const NOMBRES_SERVICIO: Record<string, string> = {
  pacientes: 'pacientes',
  medicos: 'médicos',
  especialidades: 'especialidades',
  turnos: 'turnos',
  consultas: 'consultas',
  asistente: 'asistente',
}

/** "/api/medicos/3" -> "médicos" */
export function servicioDeRuta(ruta: string): string {
  const segmento = ruta.split('?')[0].split('/').filter(Boolean)[1] ?? ''
  return NOMBRES_SERVICIO[segmento] ?? segmento
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  cuerpo?: unknown
  /** Tiempo máximo de espera en milisegundos (por defecto 15 s). */
  timeoutMs?: number
}

interface ProblemDetail {
  title?: string
  detail?: string
  errores?: Record<string, string>
  servicio?: string
}

export async function solicitar<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { metodo = 'GET', cuerpo, timeoutMs = 15_000 } = opciones
  const servicio = servicioDeRuta(ruta)
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs)

  const encabezados: Record<string, string> = { Accept: 'application/json' }
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json'
  const token = autenticacion.obtenerToken()
  if (token) encabezados.Authorization = `Bearer ${token}`

  let respuesta: Response
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: controlador.signal,
    })
  } catch {
    if (controlador.signal.aborted) {
      throw new ErrorApi('tiempo', `El servicio de ${servicio} tardó demasiado en responder. Intentá nuevamente.`, { servicio })
    }
    throw new ErrorApi('red', 'No se pudo conectar con el servidor. Verificá que el sistema esté iniciado.', { servicio })
  } finally {
    clearTimeout(temporizador)
  }

  if (respuesta.status === 204) {
    return undefined as T
  }

  const texto = await respuesta.text()
  let datos: unknown = undefined
  try {
    datos = texto ? JSON.parse(texto) : undefined
  } catch {
    datos = undefined // por ejemplo, una página de error HTML del proxy
  }

  if (respuesta.ok) {
    return datos as T
  }

  const problema = (datos ?? {}) as ProblemDetail
  const detalle = problema.detail
  const estado = respuesta.status

  if (estado === 401) {
    // En el login, 401 significa usuario o contraseña incorrectos; en el resto, sesión vencida o inválida.
    if (!ruta.startsWith('/api/auth/')) autenticacion.alExpirar()
    throw new ErrorApi('sesion', detalle ?? 'Tu sesión expiró. Iniciá sesión nuevamente.', { estado })
  }
  if (estado === 403) {
    throw new ErrorApi('prohibido', detalle ?? 'No tenés permiso para realizar esta operación.', { estado })
  }
  if (estado === 400) {
    throw new ErrorApi('validacion', detalle ?? 'Hay datos inválidos en el formulario.', { estado, errores: problema.errores })
  }
  if (estado === 404) {
    throw new ErrorApi('no-encontrado', detalle ?? 'El recurso solicitado no existe.', { estado })
  }
  if (estado === 409 || estado === 422) {
    throw new ErrorApi('negocio', detalle ?? 'La operación no está permitida.', { estado })
  }
  if (estado === 502 || estado === 503 || estado === 504) {
    const servicioAfectado = problema.servicio ? (NOMBRES_SERVICIO[problema.servicio] ?? problema.servicio) : servicio
    throw new ErrorApi('no-disponible',
      detalle ?? `El servicio de ${servicioAfectado} no está disponible en este momento. Intentá nuevamente en unos minutos.`,
      { estado, servicio: servicioAfectado })
  }
  throw new ErrorApi('desconocido', detalle ?? `Ocurrió un error inesperado (código ${estado}).`, { estado })
}

/** Arma un query string ignorando los valores vacíos. */
export function consulta(parametros: Record<string, string | number | boolean | undefined | null>): string {
  const busqueda = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      busqueda.set(clave, String(valor))
    }
  }
  const texto = busqueda.toString()
  return texto ? `?${texto}` : ''
}

/** Mensaje para mostrar a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
