/// <reference types="vitest/config" />
import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * En desarrollo (npm run dev) Vite actúa como "proxy": el navegador habla solo con
 * http://localhost:5173 y Vite reenvía cada ruta /api/... al microservicio que corresponde.
 * Así no hace falta configurar CORS y el código del frontend usa rutas relativas.
 * En Docker, nginx cumple exactamente el mismo rol (ver nginx/default.conf.template).
 *
 * Las URLs se pueden cambiar con variables de entorno (por ejemplo PACIENTE_SERVICE_URL).
 */
const servicios = {
  pacientes: process.env.PACIENTE_SERVICE_URL ?? 'http://localhost:8081',
  medicos: process.env.MEDICO_SERVICE_URL ?? 'http://localhost:8082',
  especialidades: process.env.ESPECIALIDAD_SERVICE_URL ?? 'http://localhost:8083',
  turnos: process.env.TURNO_SERVICE_URL ?? 'http://localhost:8084',
  consultas: process.env.CONSULTA_SERVICE_URL ?? 'http://localhost:8085',
}

const proxy: Record<string, ProxyOptions> = {
  '/api/asistente': { target: servicios.consultas, timeout: 180_000, proxyTimeout: 180_000 },
  // Inicio de sesión y cuentas de usuario: los gestiona paciente-service
  '/api/auth': { target: servicios.pacientes },
  '/api/usuarios': { target: servicios.pacientes },
}
for (const [nombre, destino] of Object.entries(servicios)) {
  proxy[`/api/${nombre}`] = { target: destino }
  // /estado/pacientes -> http://localhost:8081/actuator/health
  proxy[`/estado/${nombre}`] = { target: destino, rewrite: () => '/actuator/health' }
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, proxy },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
