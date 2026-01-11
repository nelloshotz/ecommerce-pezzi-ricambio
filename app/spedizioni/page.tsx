'use client'

import { useState, useEffect } from 'react'

export default function SpedizioniPage() {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContent() {
      try {
        const response = await fetch('/api/footer/content', {
          cache: 'no-store',
        })

        if (response.ok) {
          const data = await response.json()
          setContent(data.spedizioni)
        }
      } catch (error) {
        console.error('Errore nel caricamento contenuto:', error)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Caricamento...</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Spedizioni</h1>
          <p className="text-gray-600">Contenuto non disponibile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Spedizioni</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="prose max-w-none">
            <div className="whitespace-pre-line text-gray-700 leading-relaxed">
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

