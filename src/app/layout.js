import './globals.css'

export const metadata = {
  title: 'CAPRI Básquet - Gestión Subcomisión',
  description: 'Sistema de gestión de campañas y gastos - Subcomisión de Básquet Club CAPRI Posadas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
