import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { usuariosApi, type NuevoUsuario } from '../../api/servicios'
import { MensajeError, Recurso, Vacio } from '../../componentes/Estados'
import { Campo, CampoClave, ErrorFormulario, SeccionFormulario, erroresDelServidor } from '../../componentes/Formulario'
import { Icono } from '../../componentes/Icono'
import { useNotificar } from '../../componentes/Notificaciones'
import { BotonConfirmar, EncabezadoPagina, Insignia, InsigniaActivo, Persona } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { NOMBRE_ROL } from '../../sesion/almacen'
import { useSesion } from '../../sesion/Sesion'
import { cantidad } from '../../utilidades/formato'
import { hayErrores, sinError, type Errores } from '../../utilidades/validaciones'

const VACIO: NuevoUsuario = { usuario: '', nombre: '', clave: '', rol: 'MEDICO' }

/** Cuentas del sistema. Las de pacientes se crean con "Crear cuenta" o desde la ficha del paciente. */
export function Usuarios() {
  const { usuario: actual } = useSesion()
  const notificar = useNotificar()
  const carga = useCarga(() => usuariosApi.listar(), [])
  const [datos, setDatos] = useState<NuevoUsuario>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [errorAlta, setErrorAlta] = useState<unknown>(null)
  const [errorAccion, setErrorAccion] = useState<unknown>(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo: keyof NuevoUsuario, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((a) => sinError(a, campo))
  }

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    setErrorAlta(null)
    const encontrados: Errores = {}
    if (!/^[A-Za-z0-9._-]{3,60}$/.test(datos.usuario)) encontrados.usuario = 'Entre 3 y 60 caracteres: letras, números, punto, guion o guion bajo'
    if (!datos.nombre.trim()) encontrados.nombre = 'El nombre es obligatorio'
    if (datos.clave.length < 8 || datos.clave.length > 72) encontrados.clave = 'La contraseña debe tener entre 8 y 72 caracteres'
    setErrores(encontrados)
    if (hayErrores(encontrados)) return
    setGuardando(true)
    try {
      await usuariosApi.crear(datos)
      notificar(`Usuario ${datos.usuario} creado`)
      setDatos(VACIO)
      carga.recargar()
    } catch (err) {
      setErrores(erroresDelServidor(err))
      setErrorAlta(err)
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = (id: number, activar: boolean) => async () => {
    setErrorAccion(null)
    try {
      await (activar ? usuariosApi.activar(id) : usuariosApi.desactivar(id))
      notificar(activar ? 'Usuario activado' : 'Usuario desactivado')
      carga.recargar()
    } catch (err) {
      setErrorAccion(err)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Usuarios" icono="escudo" descripcion="Cuentas para iniciar sesión en el sistema." />

      <form className="formulario" onSubmit={crear} noValidate style={{ maxWidth: 'none' }}>
        <SeccionFormulario titulo="Nueva cuenta del personal"
          descripcion='Las cuentas de pacientes se crean desde la ficha del paciente ("Habilitar acceso web") o por el propio paciente con "Crear cuenta".'>
          <ErrorFormulario error={errorAlta} />
          <div className="grilla-campos" style={{ marginTop: errorAlta ? '1rem' : 0 }}>
            <Campo etiqueta="Usuario" obligatorio error={errores.usuario} ayuda="Ej.: dra.gomez">
              {(p) => <input {...p} value={datos.usuario} autoComplete="off" onChange={(e) => cambiar('usuario', e.target.value)} maxLength={60} />}
            </Campo>
            <Campo etiqueta="Nombre completo" obligatorio error={errores.nombre}>
              {(p) => <input {...p} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} maxLength={120} />}
            </Campo>
            <CampoClave etiqueta="Contraseña inicial" obligatorio error={errores.clave} ayuda="Mínimo 8 caracteres. Comunicásela a la persona."
              valor={datos.clave} autoComplete="new-password" alCambiar={(v) => cambiar('clave', v)} />
            <Campo etiqueta="Rol" obligatorio error={errores.rol}>
              {(p) => (
                <select {...p} value={datos.rol} onChange={(e) => cambiar('rol', e.target.value)}>
                  <option value="MEDICO">Médico/a</option>
                  <option value="ADMINISTRATIVO">Administración</option>
                </select>
              )}
            </Campo>
          </div>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            <Icono nombre="mas" tamano={18} />{guardando ? 'Creando...' : 'Crear usuario'}
          </button>
        </SeccionFormulario>
      </form>

      <section className="tarjeta">
        <div className="tarjeta-titulo">
          <h2><Icono nombre="pacientes" />Cuentas existentes</h2>
          {carga.datos && <span className="texto-tenue">{cantidad(carga.datos.length, 'cuenta', 'cuentas')}</span>}
        </div>
        {errorAccion ? <MensajeError error={errorAccion} /> : null}
        <Recurso carga={carga} textoCargando="Cargando usuarios...">
          {(usuarios) => usuarios.length === 0 ? <Vacio icono="escudo">No hay usuarios.</Vacio> : (
            <div className="tabla-contenedor">
              <table className="tabla-responsiva">
                <thead>
                  <tr><th>Persona</th><th>Usuario</th><th>Rol</th><th>Estado</th><th><span className="solo-lectores">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td data-etiqueta="Persona"><Persona nombre={u.nombre} tamano="chico" a={u.pacienteId ? `/pacientes/${u.pacienteId}` : undefined} /></td>
                      <td data-etiqueta="Usuario" className="numero">{u.usuario}</td>
                      <td data-etiqueta="Rol"><Insignia tipo={u.rol === 'PACIENTE' ? 'neutro' : 'marca'} sinPunto>{NOMBRE_ROL[u.rol]}</Insignia></td>
                      <td data-etiqueta="Estado"><InsigniaActivo activo={u.activo} /></td>
                      <td className="acciones-fila">
                        {u.usuario === actual?.usuario
                          ? <span className="texto-tenue">Tu cuenta</span>
                          : (
                            <BotonConfirmar texto={u.activo ? 'Desactivar' : 'Activar'} peligroso={u.activo}
                              pregunta={u.activo ? `¿Desactivar ${u.usuario}? No podrá iniciar sesión.` : `¿Activar ${u.usuario}?`}
                              alConfirmar={cambiarEstado(u.id, !u.activo)} />
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Recurso>
        <p className="texto-tenue" style={{ marginTop: '0.9rem' }}>
          ¿Necesitás vincular a un paciente? Abrí su ficha en <Link to="/pacientes">Pacientes</Link> y usá "Habilitar acceso web".
        </p>
      </section>
    </>
  )
}
