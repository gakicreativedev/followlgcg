import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mídia Igreja — Gestão de Tarefas',
  description: 'Plataforma de gestão da equipe de mídia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
