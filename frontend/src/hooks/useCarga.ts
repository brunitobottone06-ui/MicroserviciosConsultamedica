import { useCallback, useEffect, useRef, useState } from 'react'

export interface Carga<T> {
  datos: T | undefined
  cargando: boolean
  error: unknown
  recargar: () => void
}

/**
 * Ejecuta una función asíncrona (normalmente una llamada a la API) y expone su estado:
 * cargando, datos o error. Se vuelve a ejecutar cuando cambian las dependencias.
 */
export function useCarga<T>(funcion: () => Promise<T>, dependencias: unknown[]): Carga<T> {
  const [datos, setDatos] = useState<T>()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)
  const funcionRef = useRef(funcion)
  funcionRef.current = funcion

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    funcionRef.current()
      .then((resultado) => {
        if (vigente) setDatos(resultado)
      })
      .catch((e: unknown) => {
        if (vigente) setError(e)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [...dependencias, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { datos, cargando, error, recargar }
}
