import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SessionManager from '@/components/auth/SessionManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MotorPlanet - E-commerce Pezzi di Ricambio',
  description: 'Il tuo negozio online per pezzi di ricambio di qualità',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <SessionManager />
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}

