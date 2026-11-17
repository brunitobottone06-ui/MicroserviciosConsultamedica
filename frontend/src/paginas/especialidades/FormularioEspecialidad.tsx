import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { especialidadesApi } from '../../api/servicios'
import type { EspecialidadDatos } from '../../api/tipos'
import { Cargando, MensajeError } from '../../componentes/Estados'
import { Campo, ErrorFormulario, SeccionFormulario, erroresDelServidor } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { EncabezadoPagina } from '../../componentes/Varios'
import { hayErrores, sinError, validarEspecialidad, type Errores } from '../../utilidades/validaciones'

export function FormularioEspecialidad() {
  const { id } = useParams()
  const edicion = id !== undefined
  const navegar = useNavigate()
  const notificar = useNotificar()

  const [datos, setDatos] = useState<EspecialidadDatos>({ nombre: '', descripcion: '' })
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<unknown>(null)
  const [errorCarga, setErrorCarga] = useState<unknown>(null)
  const [cargando, setCargando] = useState(edicion)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!edicion) return
    especialidadesApi.obtener(Number(id))
      .then((e) => setDatos({ nombre: e.nombre, descripcion: e.descripcion ?? '' }))
      .catch(setErrorCarga)
      .finally(() => setCargando(false))
  }, [edicion, id])

  const cambiar = (campo: keyof EspecialidadDatos, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((actuales) => sinError(actuales, campo))
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const encontrados = validarEspecialidad(datos)
    setErrores(encontrados)
    if (hayErrores(encontrados)) return
    setGuardando(true)
    try {
      const esp = edicion ? await especialidadesApi.actualizar(Number(id), datos) : await especialidadesApi.crear(datos)
      notificar(edicion ? 'Especialidad actualizada' : `Especialidad "${esp.nombre}" creada`)
      navegar(`/especialidades/${esp.id}`)
    } catch (error) {
      setErrores(erroresDelServidor(error))
      setErrorGeneral(error)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando especialidad..." />
  if (errorCarga) return <MensajeError error={errorCarga} />

  return (
    <>
      <EncabezadoPagina titulo={edicion ? 'Editar especialidad' : 'Nueva especialidad'} icono="especialidad"
        migas={[{ texto: 'Especialidades', a: '/especialidades' }]} descripcion="Los campos marcados con * son obligatorios." />
      <form className="formulario" onSubmit={guardar} noValidate style={{ maxWidth: 720 }}>
        <ErrorFormulario error={errorGeneral} />
        <SeccionFormulario titulo="Datos de la especialidad">
          <Campo etiqueta="Nombre" obligatorio error={errores.nombre}>
            {(p) => <input {...p} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} maxLength={100} autoFocus />}
          </Campo>
          <Campo etiqueta="Descripción" error={errores.descripcion} ayuda={`${datos.descripcion.length}/500 caracteres`}>
            {(p) => <textarea {...p} rows={4} value={datos.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} maxLength={500} />}
          </Campo>
        </SeccionFormulario>
        <div className="barra-acciones">
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="check" tamano={18} />{guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <Link to={edicion ? `/especialidades/${id}` : '/especialidades'} className="boton boton-secundario">Cancelar</Link>
        </div>
      </form>
    </>
  )
}
