import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { especialidadesApi, medicosApi } from '../../api/servicios'
import { Recurso, Vacio } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { Buscador, EncabezadoPagina, InsigniaActivo } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { usePermisos } from '../../sesion/Sesion'
import { cantidad } from '../../utilidades/formato'

export function ListaEspecialidades() {
  const { esAdministrativo } = usePermisos()
  const [incluirInactivas, setIncluirInactivas] = useState(false)
  const [texto, setTexto] = useState('')
  const carga = useCarga(() => especialidadesApi.listar({ incluirInactivas }), [incluirInactivas])
  // Cantidad de médicos activos por especialidad (dato real, calculado desde el servicio de médicos)
  const medicos = useCarga(() => medicosApi.listar(), [])
  const medicosPorEspecialidad = useMemo(() => {
    const cuenta = new Map<number, number>()
    for (const m of medicos.datos ?? []) for (const id of m.especialidadIds) cuenta.set(id, (cuenta.get(id) ?? 0) + 1)
    return cuenta
  }, [medicos.datos])
  const buscado = texto.trim().toLowerCase()

  return (
    <>
      <EncabezadoPagina titulo="Especialidades" icono="especialidad" descripcion="Especialidades médicas que ofrece el consultorio."
        acciones={esAdministrativo
          ? <Link to="/especialidades/nueva" className="boton boton-primario"><Icono nombre="mas" tamano={18} />Nueva especialidad</Link>
          : undefined} />

      <section className="tarjeta tarjeta-plana">
        <div className="herramientas" style={{ marginBottom: 0 }}>
          <Buscador id="buscar-especialidad" etiqueta="Buscar" valor={texto} alCambiar={setTexto} placeholder="Nombre o descripción" />
          <label className="casilla">
            <input type="checkbox" checked={incluirInactivas} onChange={(e) => setIncluirInactivas(e.target.checked)} />
            Mostrar dadas de baja
          </label>
        </div>
      </section>

      <Recurso carga={carga} textoCargando="Cargando especialidades...">
        {(especialidades) => {
          const lista = especialidades.filter((e) => !buscado || `${e.nombre} ${e.descripcion ?? ''}`.toLowerCase().includes(buscado))
          if (lista.length === 0) {
            return (
              <section className="tarjeta">
                <Vacio icono="especialidad" titulo="No hay especialidades para mostrar"
                  accion={esAdministrativo && especialidades.length === 0 ? <Link to="/especialidades/nueva" className="boton boton-primario">Crear especialidad</Link> : undefined}>
                  {buscado ? 'Probá con otra búsqueda.' : 'Todavía no hay especialidades cargadas.'}
                </Vacio>
              </section>
            )
          }
          return (
            <div className="grilla-tarjetas">
              {lista.map((e) => {
                const n = medicosPorEspecialidad.get(e.id)
                return (
                  <article key={e.id} className={`tarjeta-item ${e.activa ? '' : 'inactivo'}`}>
                    <div className="tarjeta-item-cabecera">
                      <span className="persona">
                        <span className="icono-especialidad"><Icono nombre="especialidad" /></span>
                        <div>
                          <strong><Link to={`/especialidades/${e.id}`}>{e.nombre}</Link></strong>
                          <small>
                            {medicos.error ? 'Médicos: sin datos' : medicos.datos ? cantidad(n ?? 0, 'médico activo', 'médicos activos') : 'Contando médicos…'}
                          </small>
                        </div>
                      </span>
                      <InsigniaActivo activo={e.activa} femenino />
                    </div>
                    <p>{e.descripcion ?? 'Sin descripción.'}</p>
                    <div className="tarjeta-item-pie">
                      <Link to={`/especialidades/${e.id}`} className="boton boton-secundario boton-chico">
                        <Icono nombre="ver" tamano={16} />Ver<span className="solo-lectores"> {e.nombre}</span>
                      </Link>
                      {esAdministrativo && (
                        <Link to={`/especialidades/${e.id}/editar`} className="boton boton-secundario boton-chico">
                          <Icono nombre="editar" tamano={16} />Editar<span className="solo-lectores"> {e.nombre}</span>
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )
        }}
      </Recurso>
    </>
  )
}
