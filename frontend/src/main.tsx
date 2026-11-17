import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { ProveedorNotificaciones } from './componentes/Notificaciones'
import { ProveedorSesion } from './sesion/Sesion'
import './estilos.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorNotificaciones>
          <App />
        </ProveedorNotificaciones>
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
)
