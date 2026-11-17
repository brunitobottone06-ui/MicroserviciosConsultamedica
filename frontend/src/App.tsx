import { Route, Routes } from 'react-router'
import { Layout } from './componentes/Layout'
import { RutaProtegida } from './sesion/Sesion'
import { Inicio } from './paginas/Inicio'
import { NoEncontrada } from './paginas/NoEncontrada'
import { Asistente } from './paginas/Asistente'
import { IniciarSesion } from './paginas/acceso/IniciarSesion'
import { CrearCuenta } from './paginas/acceso/CrearCuenta'
import { Usuarios } from './paginas/acceso/Usuarios'
import { MisDatos } from './paginas/pacientes/MisDatos'
import { ListaPacientes } from './paginas/pacientes/ListaPacientes'
import { FormularioPaciente } from './paginas/pacientes/FormularioPaciente'
import { DetallePaciente } from './paginas/pacientes/DetallePaciente'
import { ListaMedicos } from './paginas/medicos/ListaMedicos'
import { FormularioMedico } from './paginas/medicos/FormularioMedico'
import { DetalleMedico } from './paginas/medicos/DetalleMedico'
import { ListaEspecialidades } from './paginas/especialidades/ListaEspecialidades'
import { FormularioEspecialidad } from './paginas/especialidades/FormularioEspecialidad'
import { DetalleEspecialidad } from './paginas/especialidades/DetalleEspecialidad'
import { ListaTurnos } from './paginas/turnos/ListaTurnos'
import { FormularioTurno } from './paginas/turnos/FormularioTurno'
import { DetalleTurno } from './paginas/turnos/DetalleTurno'
import { ListaConsultas } from './paginas/consultas/ListaConsultas'
import { FormularioConsulta } from './paginas/consultas/FormularioConsulta'
import { DetalleConsulta } from './paginas/consultas/DetalleConsulta'

/**
 * Rutas de la aplicación. Las restricciones por rol del frontend solo ordenan la interfaz:
 * la protección real la hace cada microservicio verificando el token.
 */
export function App() {
  const personal = ['ADMINISTRATIVO', 'MEDICO'] as const
  const admin = ['ADMINISTRATIVO'] as const
  return (
    <Routes>
      <Route path="login" element={<IniciarSesion />} />
      <Route path="registro" element={<CrearCuenta />} />

      <Route element={<RutaProtegida><Layout /></RutaProtegida>}>
        <Route index element={<Inicio />} />
        <Route path="asistente" element={<Asistente />} />
        <Route path="mis-datos" element={<RutaProtegida roles={['PACIENTE']}><MisDatos /></RutaProtegida>} />

        <Route path="pacientes" element={<RutaProtegida roles={[...personal]}><ListaPacientes /></RutaProtegida>} />
        <Route path="pacientes/nuevo" element={<RutaProtegida roles={[...admin]}><FormularioPaciente /></RutaProtegida>} />
        <Route path="pacientes/:id" element={<RutaProtegida roles={[...personal]}><DetallePaciente /></RutaProtegida>} />
        <Route path="pacientes/:id/editar" element={<RutaProtegida roles={[...admin]}><FormularioPaciente /></RutaProtegida>} />

        <Route path="medicos" element={<RutaProtegida roles={[...personal]}><ListaMedicos /></RutaProtegida>} />
        <Route path="medicos/nuevo" element={<RutaProtegida roles={[...admin]}><FormularioMedico /></RutaProtegida>} />
        <Route path="medicos/:id" element={<RutaProtegida roles={[...personal]}><DetalleMedico /></RutaProtegida>} />
        <Route path="medicos/:id/editar" element={<RutaProtegida roles={[...admin]}><FormularioMedico /></RutaProtegida>} />

        <Route path="especialidades" element={<RutaProtegida roles={[...personal]}><ListaEspecialidades /></RutaProtegida>} />
        <Route path="especialidades/nueva" element={<RutaProtegida roles={[...admin]}><FormularioEspecialidad /></RutaProtegida>} />
        <Route path="especialidades/:id" element={<RutaProtegida roles={[...personal]}><DetalleEspecialidad /></RutaProtegida>} />
        <Route path="especialidades/:id/editar" element={<RutaProtegida roles={[...admin]}><FormularioEspecialidad /></RutaProtegida>} />

        {/* Turnos: todos los roles (un paciente solo ve y pide los suyos) */}
        <Route path="turnos" element={<ListaTurnos />} />
        <Route path="turnos/nuevo" element={<FormularioTurno />} />
        <Route path="turnos/:id" element={<DetalleTurno />} />
        <Route path="turnos/:id/editar" element={<RutaProtegida roles={[...admin]}><FormularioTurno /></RutaProtegida>} />

        {/* Consultas: datos clínicos, solo médicos */}
        <Route path="consultas" element={<RutaProtegida roles={['MEDICO']}><ListaConsultas /></RutaProtegida>} />
        <Route path="consultas/nueva" element={<RutaProtegida roles={['MEDICO']}><FormularioConsulta /></RutaProtegida>} />
        <Route path="consultas/:id" element={<RutaProtegida roles={['MEDICO']}><DetalleConsulta /></RutaProtegida>} />
        <Route path="consultas/:id/editar" element={<RutaProtegida roles={['MEDICO']}><FormularioConsulta /></RutaProtegida>} />

        <Route path="usuarios" element={<RutaProtegida roles={[...admin]}><Usuarios /></RutaProtegida>} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  )
}
