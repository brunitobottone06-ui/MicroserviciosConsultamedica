import type { ReactNode } from 'react'
import { Icono } from '../../componentes/Icono'

/** Panel de bienvenida (columna izquierda) de las pantallas de acceso. */
export function PanelMarca() {
  return (
    <aside className="acceso-marca" aria-hidden="true">
      <div className="marca">
        <span className="marca-logo"><Icono nombre="cruz" tamano={22} /></span>
        <span className="marca-texto"><strong>Consultorio</strong><small>Atención y turnos</small></span>
      </div>
      <div>
        <h2>Tu salud, con turnos simples y a tiempo.</h2>
        <p>Reservá, consultá y cancelá tus turnos desde un solo lugar. El equipo del consultorio gestiona la agenda y la atención.</p>
        <ul className="acceso-ventajas">
          <li><Icono nombre="calendarioMas" />Pedí turno en dos pasos</li>
          <li><Icono nombre="reloj" />Elegí el día y el horario disponible</li>
          <li><Icono nombre="candado" />Tus datos, protegidos con tu cuenta</li>
        </ul>
      </div>
      <p className="acceso-pie">Sistema local del consultorio</p>
      <svg className="acceso-ilustracion" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="6">
        <circle cx="100" cy="100" r="88" />
        <path d="M78 40h44v38h38v44h-38v38H78v-38H40V78h38z" fill="currentColor" stroke="none" />
      </svg>
    </aside>
  )
}

/** Estructura común: panel de marca + columna del formulario. */
export function PantallaAcceso({ children, ancha = false }: { children: ReactNode; ancha?: boolean }) {
  return (
    <div className="acceso">
      <PanelMarca />
      <main className="acceso-formulario">
        <div className={`acceso-caja ${ancha ? 'acceso-caja-ancha' : ''}`}>
          <div className="marca marca-movil">
            <span className="marca-logo"><Icono nombre="cruz" tamano={22} /></span>
            <span className="marca-texto"><strong>Consultorio</strong><small>Atención y turnos</small></span>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
