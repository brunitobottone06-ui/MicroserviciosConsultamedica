/**
 * Íconos del sistema: SVG de trazo simple (24x24) dibujados para este proyecto, sin librerías externas.
 * Heredan el color del texto (currentColor) y son decorativos (aria-hidden) salvo que se indique un título.
 */
const TRAZOS = {
  inicio: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9.5 21v-6h5v6'],
  calendario: ['M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 10h18', 'M8 3v4', 'M16 3v4'],
  calendarioMas: ['M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 10h18', 'M8 3v4', 'M16 3v4', 'M12 13v5', 'M9.5 15.5h5'],
  pacientes: ['M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M16 4.6a3.5 3.5 0 0 1 0 6.8', 'M18 14.3a6.5 6.5 0 0 1 3.5 5.7'],
  usuario: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  medico: ['M6 3v5a4 4 0 0 0 8 0V3', 'M10 12v3a5 5 0 0 0 10 0v-2', 'M20 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  especialidad: ['M19.5 12.6 12 20l-7.5-7.4A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 7.5 6.2z', 'M3.5 12.5h4l1.5-2.5 2.5 5 1.5-2.5h7.5'],
  consulta: ['M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M9 2.5h6v3H9z', 'M9 11h6', 'M9 15h4'],
  asistente: ['M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z', 'M8.5 12h.01', 'M12 12h.01', 'M15.5 12h.01'],
  escudo: ['M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z', 'M9 12l2 2 4-4'],
  salir: ['M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3', 'M16 16l4-4-4-4', 'M20 12H9'],
  mas: ['M12 5v14', 'M5 12h14'],
  buscar: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  editar: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z', 'M13.5 6.5l4 4'],
  papelera: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  ver: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  cerrar: ['M6 6l12 12', 'M18 6L6 18'],
  alerta: ['M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z', 'M12 9.5v4', 'M12 17h.01'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'],
  reloj: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  izquierda: ['M15 6l-6 6 6 6'],
  derecha: ['M9 6l6 6-6 6'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  telefono: ['M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'],
  email: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 7l9 6 9-6'],
  documento: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M9 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M6 16.5a3 3 0 0 1 6 0', 'M14.5 10h4', 'M14.5 14h3'],
  actividad: ['M3 12h4l3-8 4 16 3-8h4'],
  refrescar: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 4v7h-7'],
  enviar: ['M4 12 20 4l-6 16-3-7z', 'M11 13l9-9'],
  chispa: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z'],
  candado: ['M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  filtro: ['M3 5h18l-7 8v6l-4 2v-8z'],
  servidor: ['M5 4h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M5 13h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z', 'M7 7.5h.01', 'M7 16.5h.01'],
  cruz: ['M9 3h6v6h6v6h-6v6H9v-6H3V9h6z'],
  cancelar: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M5.6 5.6l12.8 12.8'],
  ojoTachado: ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1', 'M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  tendencia: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
} as const

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, tamano = 20, titulo, className }: {
  nombre: NombreIcono
  tamano?: number
  titulo?: string
  className?: string
}) {
  return (
    <svg className={`icono ${className ?? ''}`} width={tamano} height={tamano} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true} role={titulo ? 'img' : undefined} aria-label={titulo} focusable="false">
      {TRAZOS[nombre].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
