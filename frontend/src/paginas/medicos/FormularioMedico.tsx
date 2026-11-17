import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { especialidadesApi, medicosApi } from '../../api/servicios'
import type { MedicoDatos } from '../../api/tipos'
import { Cargando, MensajeError } from '../../componentes/Estados'
import { Campo, ErrorFormulario, SeccionFormulario, erroresDelServidor } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { EncabezadoPagina } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { hayErrores, sinError, validarMedico, type Errores } from '../../utilidades/validaciones'

const VACIO: MedicoDatos = { nombre: '', apellido: '', matricula: '', email: '', telefono: '', especialidadIds: [] }

export function FormularioMedico() {
  const { id } = useParams()
  const edicion = id !== undefined
  const navegar = useNavigate()
  const notificar = useNotificar()
  const especialidades = useCarga(() => especialidadesApi.listar({ incluirInactivas: true }), [])

  const [datos, setDatos] = useState<MedicoDatos>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<unknown>(null)
  const [errorCarga, setErrorCarga] = useState<unknown>(null)
  const [cargando, setCargando] = useState(edicion)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!edicion) return
    medicosApi.obtener(Number(id))
      .then((m) => setDatos({
        nombre: m.nombre, apellido: m.apellido, matricula: m.matricula, email: m.email ?? '',
        telefono: m.telefono ?? '', especialidadIds: m.especialidadIds,
      }))
      .catch(setErrorCarga)
      .finally(() => setCargando(false))
  }, [edicion, id])

  const cambiar = (campo: keyof Omit<MedicoDatos, 'especialidadIds'>, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((actuales) => sinError(actuales, campo))
  }

  const alternarEspecialidad = (especialidadId: number) => {
    setDatos((d) => ({
      ...d,
      especialidadIds: d.especialidadIds.includes(especialidadId)
        ? d.especialidadIds.filter((x) => x !== especialidadId)
        : [...d.especialidadIds, especialidadId],
    }))
    setErrores((actuales) => sinError(actuales, 'especialidadIds'))
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const encontrados = validarMedico(datos)
    setErrores(encontrados)
    if (hayErrores(encontrados)) return
    setGuardando(true)
    try {
      const medico = edicion ? await medicosApi.actualizar(Number(id), datos) : await medicosApi.crear(datos)
      notificar(edicion ? 'Datos del médico actualizados' : `Médico ${medico.nombre} ${medico.apellido} registrado`)
      navegar(`/medicos/${medico.id}`)
    } catch (error) {
      setErrores(erroresDelServidor(error))
      setErrorGeneral(error)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando médico..." />
  if (errorCarga) return <MensajeError error={errorCarga} />

  // Se muestran las especialidades activas y, además, las inactivas que el médico ya tenía asignadas.
  const opciones = (especialidades.datos ?? []).filter((e) => e.activa || datos.especialidadIds.includes(e.id))

  return (
    <>
      <EncabezadoPagina titulo={edicion ? 'Editar médico' : 'Nuevo médico'} icono="medico"
        migas={[{ texto: 'Médicos', a: '/medicos' }]} descripcion="Los campos marcados con * son obligatorios." />
      <form className="formulario" onSubmit={guardar} noValidate>
        <ErrorFormulario error={errorGeneral} />
        <SeccionFormulario numero={1} titulo="Datos del profesional">
          <div className="grilla-campos">
            <Campo etiqueta="Nombre" obligatorio error={errores.nombre}>
              {(p) => <input {...p} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} maxLength={80} autoFocus autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Apellido" obligatorio error={errores.apellido}>
              {(p) => <input {...p} value={datos.apellido} onChange={(e) => cambiar('apellido', e.target.value)} maxLength={80} autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Matrícula" obligatorio error={errores.matricula} ayuda="Ej.: MN 12345">
              {(p) => <input {...p} value={datos.matricula} onChange={(e) => cambiar('matricula', e.target.value)} maxLength={30} autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Email" error={errores.email}>
              {(p) => <input {...p} type="email" value={datos.email} onChange={(e) => cambiar('email', e.target.value)} maxLength={120} autoComplete="off" />}
            </Campo>
            <Campo etiqueta="Teléfono" error={errores.telefono}>
              {(p) => <input {...p} type="tel" value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} maxLength={30} autoComplete="off" />}
            </Campo>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Especialidades que atiende *" id="titulo-especialidades"
          descripcion="Elegí una o más. Solo podrá recibir turnos de estas especialidades.">
          {especialidades.cargando && <Cargando texto="Cargando especialidades..." lineas={0} />}
          {especialidades.error ? <MensajeError error={especialidades.error} alReintentar={especialidades.recargar} /> : null}
          <fieldset className="opciones" aria-labelledby="titulo-especialidades">
            {opciones.map((esp) => (
              <label key={esp.id} className="opcion">
                <input type="checkbox" checked={datos.especialidadIds.includes(esp.id)} onChange={() => alternarEspecialidad(esp.id)} />
                <span className="opcion-caja">
                  <Icono nombre="especialidad" tamano={18} />
                  <span>{esp.nombre}{!esp.activa && <small>Dada de baja</small>}</span>
                  <Icono nombre="check" tamano={18} className="opcion-marca" />
                </span>
              </label>
            ))}
          </fieldset>
          {errores.especialidadIds && <small className="error-campo" style={{ marginTop: '0.6rem' }}><Icono nombre="alerta" tamano={14} />{errores.especialidadIds}</small>}
        </SeccionFormulario>

        <div className="barra-acciones">
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="check" tamano={18} />{guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <Link to={edicion ? `/medicos/${id}` : '/medicos'} className="boton boton-secundario">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
