import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { pacientesApi } from '../../api/servicios'
import { Recurso, Vacio } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { EncabezadoPagina, InsigniaActivo, Persona } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { usePermisos } from '../../sesion/Sesion'
import { cantidad, edad } from '../../utilidades/formato'

export function ListaPacientes() {
  const { esAdministrativo } = usePermisos()
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const carga = useCarga(() => pacientesApi.listar({ buscar, incluirInactivos }), [buscar, incluirInactivos])

  const alBuscar = (e: FormEvent) => {
    e.preventDefault()
    setBuscar(texto.trim())
  }

  return (
    <>
      <EncabezadoPagina titulo="Pacientes" icono="pacientes" descripcion="Personas atendidas en el consultorio."
        acciones={esAdministrativo
          ? <Link to="/pacientes/nuevo" className="boton boton-primario"><Icono nombre="mas" tamano={18} />Nuevo paciente</Link>
          : undefined} />

      <section className="tarjeta">
        <form className="herramientas" onSubmit={alBuscar} role="search">
          <div className="campo campo-busqueda">
            <label htmlFor="buscar-paciente">Buscar por nombre, apellido o DNI</label>
            <div className="buscador">
              <Icono nombre="buscar" tamano={18} />
              <input id="buscar-paciente" type="search" value={texto} onChange={(e) => setTexto(e.target.value)}
                placeholder="Ej.: Torres o 30111222" />
            </div>
          </div>
          <button type="submit" className="boton boton-secundario">Buscar</button>
          <label className="casilla">
            <input type="checkbox" checked={incluirInactivos} onChange={(e) => setIncluirInactivos(e.target.checked)} />
            Mostrar dados de baja
          </label>
          {carga.datos && <span className="contador">{cantidad(carga.datos.length, 'paciente', 'pacientes')}</span>}
        </form>

        <Recurso carga={carga} textoCargando="Cargando pacientes...">
          {(pacientes) => pacientes.length === 0
            ? (
              <Vacio icono="pacientes" titulo={buscar ? 'Sin resultados' : 'Todavía no hay pacientes'}
                accion={!buscar && esAdministrativo ? <Link to="/pacientes/nuevo" className="boton boton-primario">Cargar el primero</Link> : undefined}>
                {buscar ? `No hay pacientes que coincidan con "${buscar}".` : 'Cuando se registren pacientes van a aparecer acá.'}
              </Vacio>
            )
            : (
              <div className="tabla-contenedor">
                <table className="tabla-responsiva">
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>DNI</th>
                      <th>Edad</th>
                      <th>Teléfono</th>
                      <th>Obra social</th>
                      <th>Estado</th>
                      <th><span className="solo-lectores">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacientes.map((p) => (
                      <tr key={p.id}>
                        <td data-etiqueta="Paciente">
                          <Persona nombre={`${p.apellido}, ${p.nombre}`} a={`/pacientes/${p.id}`} detalle={p.email ?? undefined} />
                        </td>
                        <td data-etiqueta="DNI" className="numero">{p.dni}</td>
                        <td data-etiqueta="Edad">{edad(p.fechaNacimiento)} años</td>
                        <td data-etiqueta="Teléfono">{p.telefono ?? '—'}</td>
                        <td data-etiqueta="Obra social">{p.obraSocial ?? '—'}</td>
                        <td data-etiqueta="Estado"><InsigniaActivo activo={p.activo} /></td>
                        <td className="acciones-fila">
                          <Link to={`/pacientes/${p.id}`} className="boton boton-secundario boton-chico">
                            <Icono nombre="ver" tamano={16} />Ver<span className="solo-lectores"> {p.nombre} {p.apellido}</span>
                          </Link>
                          {esAdministrativo && (
                            <Link to={`/pacientes/${p.id}/editar`} className="boton boton-secundario boton-chico">
                              <Icono nombre="editar" tamano={16} />Editar<span className="solo-lectores"> {p.nombre} {p.apellido}</span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Recurso>
      </section>
    </>
  )
}
