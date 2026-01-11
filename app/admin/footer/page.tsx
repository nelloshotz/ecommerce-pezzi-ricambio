'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiPlus, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

interface FAQItem {
  domanda: string
  risposta: string
}

export default function AdminFooterPage() {
  const { user } = useAuthStore()
  const [chiSiamo, setChiSiamo] = useState('')
  const [spedizioni, setSpedizioni] = useState('')
  const [faq, setFaq] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadContent() {
      if (!user?.id) return

      try {
        setLoading(true)
        const response = await fetch('/api/admin/footer', {
          headers: {
            'x-user-id': user.id,
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.details || 'Errore nel caricamento contenuto footer')
        }

        const data = await response.json()
        setChiSiamo(data.chiSiamo || '')
        setSpedizioni(data.spedizioni || '')
        setFaq(data.faq || [])
      } catch (err: any) {
        console.error('Errore nel caricamento contenuto:', err)
        setError(err.message || 'Errore nel caricamento contenuto footer, controlla che ci siano i campi (e la tabella adatta) nel database')
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      loadContent()
    }
  }, [user?.id])

  const handleAddFAQ = () => {
    setFaq([...faq, { domanda: '', risposta: '' }])
  }

  const handleRemoveFAQ = (index: number) => {
    setFaq(faq.filter((_, i) => i !== index))
  }

  const handleUpdateFAQ = (index: number, field: 'domanda' | 'risposta', value: string) => {
    const updatedFaq = [...faq]
    updatedFaq[index] = { ...updatedFaq[index], [field]: value }
    setFaq(updatedFaq)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/footer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          chiSiamo: chiSiamo.trim() || null,
          spedizioni: spedizioni.trim() || null,
          faq: faq.filter((item) => item.domanda.trim() && item.risposta.trim()),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nel salvataggio contenuto')
      }

      setSuccess('Contenuto footer salvato con successo!')
      setChiSiamo(data.chiSiamo || '')
      setSpedizioni(data.spedizioni || '')
      setFaq(data.faq || [])
    } catch (err: any) {
      console.error('Errore nel salvataggio:', err)
      setError(err.message || 'Errore nel salvataggio contenuto')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento contenuto footer...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Gestione Contenuto Footer</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <FiAlertCircle className="inline mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <FiCheckCircle className="inline mr-2" />
          <span className="block sm:inline">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sezione Chi Siamo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Chi Siamo</h2>
          <p className="text-sm text-gray-600 mb-4">
            Questo testo verrà visualizzato nella pagina &quot;Chi Siamo&quot; accessibile dal footer.
          </p>
          <textarea
            value={chiSiamo}
            onChange={(e) => setChiSiamo(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={10}
            placeholder="Inserisci il testo per la sezione 'Chi Siamo'..."
          />
        </div>

        {/* Sezione Spedizioni */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Spedizioni</h2>
          <p className="text-sm text-gray-600 mb-4">
            Questo testo verrà visualizzato nella pagina &quot;Spedizioni&quot; accessibile dal footer.
          </p>
          <textarea
            value={spedizioni}
            onChange={(e) => setSpedizioni(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={10}
            placeholder="Inserisci il testo per la sezione 'Spedizioni'..."
          />
        </div>

        {/* Sezione FAQ */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">FAQ (Domande Frequenti)</h2>
              <p className="text-sm text-gray-600 mt-1">
                Aggiungi domande e risposte che verranno visualizzate nella pagina FAQ.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddFAQ}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <FiPlus className="w-4 h-4" />
              <span>Aggiungi FAQ</span>
            </button>
          </div>

          {faq.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nessuna FAQ aggiunta. Clicca su &quot;Aggiungi FAQ&quot; per iniziare.
            </p>
          ) : (
            <div className="space-y-4">
              {faq.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">FAQ #{index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveFAQ(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Rimuovi FAQ"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Domanda
                      </label>
                      <input
                        type="text"
                        value={item.domanda}
                        onChange={(e) => handleUpdateFAQ(index, 'domanda', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Inserisci la domanda..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Risposta
                      </label>
                      <textarea
                        value={item.risposta}
                        onChange={(e) => handleUpdateFAQ(index, 'risposta', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        rows={4}
                        placeholder="Inserisci la risposta..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pulsante Salva */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{saving ? 'Salvataggio...' : 'Salva Contenuto'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

