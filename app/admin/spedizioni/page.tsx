'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiPackage, FiAlertCircle, FiCheckCircle, FiInfo, FiPercent, FiEdit } from 'react-icons/fi'
import Link from 'next/link'
import shippingConfig from '@/lib/shipping-config.json'

interface ShippingSettings {
  markupPercent: number
  freeShippingThreshold?: number | null
  fixedShippingPrice?: number | null
  isActive: boolean
}

export default function AdminShippingPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [markupPercent, setMarkupPercent] = useState<number>(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null)
  const [fixedShippingPrice, setFixedShippingPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Il layout admin già gestisce l'autenticazione, quindi non serve un controllo aggiuntivo

  useEffect(() => {
    async function loadSettings() {
      if (!user?.id) return

      try {
        setLoading(true)
        const response = await fetch('/api/admin/shipping/settings', {
          headers: {
            'x-user-id': user.id,
          },
        })

        if (!response.ok) {
          let errorData: any = {}
          try {
            errorData = await response.json()
          } catch (e) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
          })
          const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data: ShippingSettings = await response.json()
        console.log('Shipping settings loaded:', data)
        setMarkupPercent(data.markupPercent || 0)
        setFreeShippingThreshold(data.freeShippingThreshold || null)
        setFixedShippingPrice(data.fixedShippingPrice || null)
      } catch (err: any) {
        console.error('Errore nel caricamento impostazioni:', err)
        const errorMessage = err.message || 'Errore nel caricamento impostazioni'
        setError(errorMessage)
        
        // Log lato client
        try {
          await fetch('/api/logs/error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              component: 'AdminShippingPage',
              url: window.location.href,
              user: user?.id || null,
              error: errorMessage,
              stack: err.stack,
            }),
          })
        } catch (logError) {
          console.error('Errore nel logging:', logError)
        }
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      loadSettings()
    }
  }, [user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/shipping/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          markupPercent: parseFloat(markupPercent.toString()) || 0,
          freeShippingThreshold: freeShippingThreshold && freeShippingThreshold > 0 ? parseFloat(freeShippingThreshold.toString()) : null,
          fixedShippingPrice: fixedShippingPrice && fixedShippingPrice > 0 ? parseFloat(fixedShippingPrice.toString()) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nel salvataggio impostazioni')
      }

      setSuccess('Impostazioni spedizione salvate con successo!')
      setMarkupPercent(data.markupPercent || 0)
      setFreeShippingThreshold(data.freeShippingThreshold || null)
      setFixedShippingPrice(data.fixedShippingPrice || null)
    } catch (err: any) {
      console.error('Errore nel salvataggio:', err)
      setError(err.message || 'Errore nel salvataggio impostazioni')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento impostazioni spedizione...</p>
      </div>
    )
  }

  // Debug: verifica che i valori siano caricati
  console.log('Current state:', { markupPercent, freeShippingThreshold, fixedShippingPrice })

  // Esempi di calcolo con percentuale ricarico
  const exampleBaseCosts = [8.50, 10.50, 13.00, 16.50] // Esempi da GLS
  const examples = exampleBaseCosts.map((baseCost) => ({
    baseCost,
    finalCost: Math.round(baseCost * (1 + markupPercent / 100) * 100) / 100,
    markup: Math.round(baseCost * (markupPercent / 100) * 100) / 100,
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FiPackage className="mr-3" /> Impostazioni Spedizione
      </h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Impostazioni */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Percentuale Ricarico Spedizione</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="markupPercent" className="block text-sm font-medium text-gray-700 mb-2">
                  Percentuale Ricarico (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="markupPercent"
                    step="0.1"
                    min="0"
                    max="100"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                    required
                  />
                  <FiPercent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Percentuale di ricarico applicata sul costo base della spedizione. Esempio: 10% = aggiunge 10% al costo base.
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="freeShippingThreshold" className="block text-sm font-medium text-gray-700 mb-2">
                  Importo Minimo per Spedizione Omaggio (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="freeShippingThreshold"
                    step="0.01"
                    min="0"
                    value={freeShippingThreshold ?? ''}
                    onChange={(e) => setFreeShippingThreshold(e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full pl-4 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Es. 99.00 (lascia vuoto per disattivare)"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Se un ordine raggiunge questo importo, la spedizione sarà gratuita (€0.00). Lascia vuoto per disattivare.
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="fixedShippingPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Prezzo Fisso Spedizione (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="fixedShippingPrice"
                    step="0.01"
                    min="0"
                    value={fixedShippingPrice ?? ''}
                    onChange={(e) => setFixedShippingPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full pl-4 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Es. 15.00 (lascia vuoto per disattivare)"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Prezzo fisso applicato quando uno o più prodotti nel carrello non hanno dimensioni o peso impostati. Se tutti i prodotti hanno dimensioni e peso, viene calcolato automaticamente. Lascia vuoto per disattivare.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Come funziona:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Calcolo automatico:</strong> Se tutti i prodotti hanno dimensioni (altezza, larghezza, profondità) e peso, il costo viene calcolato automaticamente in base a peso, dimensioni e corriere</li>
                      <li><strong>Prezzo fisso:</strong> Se anche solo un prodotto non ha dimensioni o peso, viene applicato il prezzo fisso (se impostato)</li>
                      <li><strong>Percentuale ricarico:</strong> Viene applicata solo al calcolo automatico (non al prezzo fisso)</li>
                      <li><strong>Spedizione gratuita:</strong> Se l'ordine raggiunge la soglia impostata, la spedizione è gratuita (€0.00)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSave className="w-4 h-4" />
                  <span>{saving ? 'Salvataggio...' : 'Salva Impostazioni'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Anteprima Calcoli */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Anteprima Calcoli</h2>
            <p className="text-sm text-gray-600 mb-4">
              Esempi di calcolo con la percentuale di ricarico impostata:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Costo Base</th>
                    <th className="text-right py-2 px-3">Ricarico ({markupPercent}%)</th>
                    <th className="text-right py-2 px-3 font-semibold">Costo Finale</th>
                  </tr>
                </thead>
                <tbody>
                  {examples.map((example, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3">€{example.baseCost.toFixed(2)}</td>
                      <td className="text-right py-2 px-3 text-gray-600">+€{example.markup.toFixed(2)}</td>
                      <td className="text-right py-2 px-3 font-semibold text-primary-600">
                        €{example.finalCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tabella Corrieri */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Configurazione Corrieri</h2>
              <Link
                href="/admin/spedizioni/carriers"
                className="flex items-center space-x-1 px-3 py-1 text-sm text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition"
              >
                <FiEdit className="w-4 h-4" />
                <span>Modifica</span>
              </Link>
            </div>
            <div className="space-y-4">
              {/* GLS */}
              <div className="border rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2">GLS</h3>
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Logica:</strong> Peso ≤ 10 kg<br />
                  <strong>Limiti:</strong> Lato max 200 cm, Somma lati 300 cm<br />
                  <strong>Peso max:</strong> 30 kg
                </p>
                <div className="text-xs text-gray-500 mt-2">
                  <p>Prezzi (kg):</p>
                  <ul className="list-disc list-inside ml-2">
                    {shippingConfig.gls.italia.prezzi_eur.map((p, i) => (
                      <li key={i}>≤ {p.max_kg} kg: €{p.prezzo.toFixed(2)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* BRT */}
              <div className="border rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2">BRT</h3>
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Logica:</strong> Peso &gt; 10 kg<br />
                  <strong>Limiti:</strong> Lato max 100 cm, Somma lati 250 cm<br />
                  <strong>Peso max:</strong> 30 kg
                </p>
                <div className="text-xs text-gray-500 mt-2">
                  <p>Prezzi (kg):</p>
                  <ul className="list-disc list-inside ml-2">
                    {shippingConfig.brt.italia.prezzi_eur.map((p, i) => (
                      <li key={i}>≤ {p.max_kg} kg: €{p.prezzo.toFixed(2)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Poste Italiane */}
              <div className="border rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2">Poste Italiane</h3>
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Logica:</strong> Pacco non standard o cliente retail<br />
                  <strong>Peso max:</strong> 20 kg
                </p>
                <div className="text-xs text-gray-500 mt-2 space-y-2">
                  <div>
                    <p className="font-medium">Standard:</p>
                    <p className="ml-2">Lato max: 100 cm, Somma: 200 cm</p>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      {shippingConfig.poste_italiane.italia.formati.standard.prezzi_eur.map((p, i) => (
                        <li key={i}>≤ {p.max_kg} kg: €{p.prezzo.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Non Standard:</p>
                    <p className="ml-2">Lato max: 150 cm, Somma: 300 cm</p>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      {shippingConfig.poste_italiane.italia.formati.non_standard.prezzi_eur.map((p, i) => (
                        <li key={i}>≤ {p.max_kg} kg: €{p.prezzo.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

