import { useState } from 'react'
import { Link } from 'react-router'
import { consultasApi } from '../../api/servicios'
import { Avisos, Recurso, Vacio } from '../../componentes/Estados'
import { Icono } from '../../componentes/Icono'
import { Buscador, EncabezadoPagina, Persona } from '../../componentes/Varios'
import { useCarga } from '../../hooks/useCarga'
import { nombreEspecialidad, nombreMedico, nombrePaciente, useCatalogos } from '../../hooks/useCatalogos'
import { cantidad, formatoFechaHora } from '../../utilidades/formato'

const ordenar = <T extends { apellido: string; nombre: string }>(lista: T[]) =>
  [...lista].sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))

export function ListaConsultas() {
  const [pacienteId, setPacienteId] = useState('')
  const [medicoId, setMedicoId] = useState('')
  const [texto, setTexto] = useState('')
  const catalogos = useCatalogos()
  const carga = useCarga(() => consultasApi.listar({
    pacienteId: pacienteId ? Number(pacienteId) : undefined,
    medicoId: medicoId ? Number(medicoId) : undefined,
  }), [pacienteId, medicoId])
  const buscado = texto.trim().toLowerCase()

  return (
    <>
      <EncabezadoPagina titulo="Consultas" icono="consulta"
        descripcion="Registro clínico de cada turno atendido. Información confidencial."
        acciones={<Link to="/consultas/nueva" className="boton boton-primario"><Icono nombre="mas" tamano={18} />Registrar consulta</Link>} />
      <section className="tarjeta">
        <div className="herramientas">
          <Buscador id="buscar-consulta" etiqueta="Buscar en motivo o diagnóstico" valor={texto} alCambiar={setTexto} placeholder="Ej.: control" />
          <div className="campo">
            <label htmlFor="c-paciente">Paciente</label>
            <select id="c-paciente" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Todos</option>
              {ordenar([...catalogos.pacientes.values()]).map((p) => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="c-medico">Médico</label>
            <select id="c-medico" value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
              <option value="">Todos</option>
              {ordenar([...catalogos.medicos.values()]).map((m) => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre}</option>)}
            </select>
          </div>
        </div>
        <Avisos avisos={catalogos.avisos} />
        <Recurso carga={carga} textoCargando="Cargando consultas...">
          {(consultas) => {
            const lista = consultas.filter((c) => !buscado || `${c.motivo} ${c.diagnostico ?? ''}`.toLowerCase().includes(buscado))
            if (lista.length === 0) {
              return (
                <Vacio icono="consulta" titulo="No hay consultas para mostrar"
                  accion={consultas.length === 0 ? <Link to="/consultas/nueva" className="boton boton-primario">Registrar consulta</Link> : undefined}>
                  {consultas.length === 0 ? 'Las consultas se registran a partir de un turno atendido.' : 'Probá con otra búsqueda.'}
                </Vacio>
              )
            }
            return (
              <>
                <p className="texto-tenue" style={{ marginBottom: '0.6rem' }}>{cantidad(lista.length, 'consulta', 'consultas')}</p>
                <div className="tabla-contenedor">
                  <table className="tabla-responsiva">
                    <thead>
                      <tr><th>Fecha</th><th>Paciente</th><th>Profesional</th><th>Motivo</th><th><span className="solo-lectores">Acciones</span></th></tr>
                    </thead>
                    <tbody>
                      {lista.map((c) => (
                        <tr key={c.id}>
                          <td data-etiqueta="Fecha" className="numero">{formatoFechaHora(c.fechaTurno)}</td>
                          <td data-etiqueta="Paciente"><Persona nombre={nombrePaciente(catalogos, c.pacienteId)} tamano="chico" /></td>
                          <td data-etiqueta="Profesional">
                            {nombreMedico(catalogos, c.medicoId)}
                            <small className="texto-tenue" style={{ display: 'block' }}>{nombreEspecialidad(catalogos, c.especialidadId)}</small>
                          </td>
                          <td data-etiqueta="Motivo" className="texto-recortado">{c.motivo}</td>
                          <td className="acciones-fila">
                            <Link to={`/consultas/${c.id}`} className="boton boton-secundario boton-chico">
                              <Icono nombre="ver" tamano={16} />Ver<span className="solo-lectores"> consulta del {formatoFechaHora(c.fechaTurno)}</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          }}
        </Recurso>
      </section>
    </>
  )
}
