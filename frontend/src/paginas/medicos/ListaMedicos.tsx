import { useState } from 'react'
import { Link } from 'react-router'
import { especialidadesApi, medicosApi } from '../../api/servicios'
import { Recurso, Vacio } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { Avatar, Buscador, EncabezadoPagina, Insignia, InsigniaActivo } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { usePermisos } from '../../sesion/Sesion'
import { cantidad } from '../../utilidades/formato'

export function ListaMedicos() {
  const { esAdministrativo } = usePermisos()
  const [especialidadId, setEspecialidadId] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [texto, setTexto] = useState('')
  const especialidades = useCarga(() => especialidadesApi.listar({ incluirInactivas: true }), [])
  const carga = useCarga(
    () => medicosApi.listar({ especialidadId: especialidadId ? Number(especialidadId) : undefined, incluirInactivos }),
    [especialidadId, incluirInactivos])

  const nombreEsp = (id: number) => especialidades.datos?.find((e) => e.id === id)?.nombre ?? `Especialidad #${id}`
  const buscado = texto.trim().toLowerCase()

  return (
    <>
      <EncabezadoPagina titulo="Médicos" icono="medico" descripcion="Profesionales del consultorio y las especialidades que atienden."
        acciones={esAdministrativo
          ? <Link to="/medicos/nuevo" className="boton boton-primario"><Icono nombre="mas" tamano={18} />Nuevo médico</Link>
          : undefined} />

      <section className="tarjeta tarjeta-plana">
        <div className="herramientas" style={{ marginBottom: 0 }}>
          <Buscador id="buscar-medico" etiqueta="Buscar" valor={texto} alCambiar={setTexto} placeholder="Nombre, apellido o matrícula" />
          <div className="campo">
            <label htmlFor="filtro-especialidad">Especialidad</label>
            <select id="filtro-especialidad" value={especialidadId} onChange={(e) => setEspecialidadId(e.target.value)}>
              <option value="">Todas</option>
              {especialidades.datos?.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <label className="casilla">
            <input type="checkbox" checked={incluirInactivos} onChange={(e) => setIncluirInactivos(e.target.checked)} />
            Mostrar dados de baja
          </label>
        </div>
        {especialidades.error ? <p className="error-campo" style={{ marginTop: '0.6rem' }}>No se pudieron cargar los nombres de las especialidades.</p> : null}
      </section>

      <Recurso carga={carga} textoCargando="Cargando médicos...">
        {(medicos) => {
          const lista = medicos.filter((m) => !buscado || `${m.nombre} ${m.apellido} ${m.matricula}`.toLowerCase().includes(buscado))
          if (lista.length === 0) {
            return (
              <section className="tarjeta">
                <Vacio icono="medico" titulo="No hay médicos para mostrar"
                  accion={esAdministrativo && medicos.length === 0 ? <Link to="/medicos/nuevo" className="boton boton-primario">Cargar médico</Link> : undefined}>
                  {buscado || especialidadId ? 'Probá con otra búsqueda o especialidad.' : 'Todavía no hay médicos cargados.'}
                </Vacio>
              </section>
            )
          }
          return (
            <>
              <p className="texto-tenue">{cantidad(lista.length, 'profesional', 'profesionales')}</p>
              <div className="grilla-tarjetas">
                {lista.map((m) => (
                  <article key={m.id} className={`tarjeta-item ${m.activo ? '' : 'inactivo'}`}>
                    <div className="tarjeta-item-cabecera">
                      <span className="persona">
                        <Avatar nombre={`${m.nombre} ${m.apellido}`} />
                        <div>
                          <strong><Link to={`/medicos/${m.id}`}>{m.apellido}, {m.nombre}</Link></strong>
                          <small>Matrícula {m.matricula}</small>
                        </div>
                      </span>
                      <InsigniaActivo activo={m.activo} />
                    </div>
                    <div className="chips">
                      {m.especialidadIds.map((id) => <Insignia key={id} tipo="marca" sinPunto>{nombreEsp(id)}</Insignia>)}
                    </div>
                    {(m.telefono || m.email) && (
                      <div>
                        {m.telefono && <p className="dato-linea"><Icono nombre="telefono" tamano={15} />{m.telefono}</p>}
                        {m.email && <p className="dato-linea"><Icono nombre="email" tamano={15} />{m.email}</p>}
                      </div>
                    )}
                    <div className="tarjeta-item-pie">
                      <Link to={`/medicos/${m.id}`} className="boton boton-secundario boton-chico">
                        <Icono nombre="ver" tamano={16} />Ver<span className="solo-lectores"> {m.nombre} {m.apellido}</span>
                      </Link>
                      {esAdministrativo && (
                        <Link to={`/medicos/${m.id}/editar`} className="boton boton-secundario boton-chico">
                          <Icono nombre="editar" tamano={16} />Editar<span className="solo-lectores"> {m.nombre} {m.apellido}</span>
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )
        }}
      </Recurso>
    </>
  )
}
