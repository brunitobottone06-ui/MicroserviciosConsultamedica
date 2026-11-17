import { useEffect, useState } from 'react'
import { mensajeDeError } from '../api/cliente'
import { especialidadesApi, medicosApi, pacientesApi } from '../api/servicios'
import type { Especialidad, Medico, Paciente } from '../api/tipos'
import { usePermisos } from '../sesion/Sesion'

export interface Catalogos {
  pacientes: Map<number, Paciente>
  medicos: Map<number, Medico>
  especialidades: Map<number, Especialidad>
  /** Avisos de catálogos que no se pudieron cargar (servicio caído). */
  avisos: string[]
  cargando: boolean
}

/**
 * Turnos y Consultas solo guardan IDs. Para mostrar nombres, el frontend consulta los servicios de
 * pacientes, médicos y especialidades. Si alguno no responde, la pantalla igual funciona y muestra
 * "Paciente #ID" (Promise.allSettled no falla si una de las promesas falla).
 */
export function useCatalogos(): Catalogos {
  const { esPaciente, pacienteId } = usePermisos()
  const [estado, setEstado] = useState<Catalogos>({
    pacientes: new Map(), medicos: new Map(), especialidades: new Map(), avisos: [], cargando: true,
  })

  useEffect(() => {
    let vigente = true
    Promise.allSettled([
      // Un paciente no puede listar a otros pacientes: solo se carga su propia ficha.
      esPaciente ? pacientesApi.obtener(pacienteId ?? 0).then((p) => [p]) : pacientesApi.listar({ incluirInactivos: true }),
      medicosApi.listar({ incluirInactivos: true }),
      especialidadesApi.listar({ incluirInactivas: true }),
    ]).then(([pacientes, medicos, especialidades]) => {
      if (!vigente) return
      const avisos: string[] = []
      const aMapa = <T extends { id: number }>(r: PromiseSettledResult<T[]>, nombre: string) => {
        if (r.status === 'fulfilled') return new Map(r.value.map((x) => [x.id, x]))
        avisos.push(`No se pudieron cargar los nombres de ${nombre}: ${mensajeDeError(r.reason)}`)
        return new Map<number, T>()
      }
      setEstado({
        pacientes: aMapa(pacientes, 'pacientes'),
        medicos: aMapa(medicos, 'médicos'),
        especialidades: aMapa(especialidades, 'especialidades'),
        avisos,
        cargando: false,
      })
    })
    return () => {
      vigente = false
    }
  }, [esPaciente, pacienteId])

  return estado
}

export function nombrePaciente(c: Catalogos, id: number): string {
  const p = c.pacientes.get(id)
  return p ? `${p.apellido}, ${p.nombre}` : `Paciente #${id}`
}

export function nombreMedico(c: Catalogos, id: number): string {
  const m = c.medicos.get(id)
  return m ? `${m.apellido}, ${m.nombre}` : `Médico #${id}`
}

export function nombreEspecialidad(c: Catalogos, id: number): string {
  return c.especialidades.get(id)?.nombre ?? `Especialidad #${id}`
}
