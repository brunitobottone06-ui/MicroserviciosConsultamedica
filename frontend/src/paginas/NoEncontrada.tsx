import { Link } from 'react-router'
import { Vacio } from '../componentes/Estados'

export function NoEncontrada() {
  return (
    <section className="tarjeta">
      <Vacio icono="buscar" titulo="Página no encontrada"
        accion={<Link to="/" className="boton boton-primario">Volver al inicio</Link>}>
        La dirección que ingresaste no existe o fue movida.
      </Vacio>
    </section>
  )
}
