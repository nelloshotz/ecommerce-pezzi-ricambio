'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiEdit, FiX, FiCheck, FiAlertCircle, FiCheckCircle, FiPackage } from 'react-icons/fi'
import Link from 'next/link'

interface CarrierConfig {
  gls: {
    italia: {
      peso_max_kg: number
      dimensioni: {
        lato_max_cm: number
        somma_lati_cm: number
      }
      prezzi_eur: Array<{ max_kg: number; prezzo: number }>
    }
  }
  brt: {
    italia: {
      peso_max_kg: number
      dimensioni: {
        lato_max_cm: number
        somma_lati_cm: number
      }
      prezzi_eur: Array<{ max_kg: number; prezzo: number }>
    }
  }
  poste_italiane: {
    italia: {
      peso_max_kg: number
      formati: {
        standard: {
          dimensioni: {
            lato_max_cm: number
            somma_lati_cm: number
          }
          prezzi_eur: Array<{ max_kg: number; prezzo: number }>
        }
        non_standard: {
          dimensioni: {
            lato_max_cm: number
            somma_lati_cm: number
          }
          prezzi_eur: Array<{ max_kg: number; prezzo: number }>
        }
      }
    }
  }
}

export default function AdminCarriersConfigPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [config, setConfig] = useState<CarrierConfig | null>(null)
  const [editingCarrier, setEditingCarrier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadConfig() {
      if (!user?.id) {
        // Se l'utente non è ancora caricato, aspetta un po'
        const timer = setTimeout(() => {
          if (!user?.id) {
            setLoading(false)
            setError('Utente non autenticato')
          }
        }, 2000)
        return () => clearTimeout(timer)
      }

      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/admin/shipping/carriers', {
          headers: {
            'x-user-id': user.id,
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          let errorData: any = {}
          try {
            errorData = await response.json()
          } catch (e) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          console.error('API Error:', errorData)
          throw new Error(errorData.error || errorData.details || 'Errore nel caricamento configurazione corrieri')
        }

        const data = await response.json()
        console.log('Config loaded:', data)
        // Gestisci sia il formato con 'config' che senza
        if (data.config) {
          setConfig(data.config)
        } else if (data.gls && data.brt && data.poste_italiane) {
          setConfig(data)
        } else {
          throw new Error('Formato configurazione non valido')
        }
      } catch (err: any) {
        console.error('Errore nel caricamento configurazione:', err)
        const errorMessage = err.message || 'Errore nel caricamento configurazione'
        setError(errorMessage)
        
        // Log lato client
        try {
          await fetch('/api/logs/error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              component: 'AdminCarriersConfigPage',
              url: window.location.href,
              user: user?.id || null,
              error: errorMessage,
              stack: err.stack,
              additionalInfo: {
                responseStatus: err.response?.status,
                responseData: err.response?.data,
              },
            }),
          })
        } catch (logError) {
          console.error('Errore nel logging:', logError)
        }
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [user?.id])

  const handleSave = async () => {
    if (!config || !user?.id) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/shipping/carriers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ config }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nel salvataggio configurazione')
      }

      setSuccess('Configurazione corrieri salvata con successo!')
      setConfig(data.config)
      setEditingCarrier(null)
    } catch (err: any) {
      console.error('Errore nel salvataggio:', err)
      setError(err.message || 'Errore nel salvataggio configurazione')
    } finally {
      setSaving(false)
    }
  }

  const updateGLS = (field: string, value: any) => {
    if (!config) return
    setConfig({
      ...config,
      gls: {
        ...config.gls,
        italia: {
          ...config.gls.italia,
          [field]: value,
        },
      },
    })
  }

  const updateBRT = (field: string, value: any) => {
    if (!config) return
    setConfig({
      ...config,
      brt: {
        ...config.brt,
        italia: {
          ...config.brt.italia,
          [field]: value,
        },
      },
    })
  }

  const updatePoste = (format: 'standard' | 'non_standard', field: string, value: any) => {
    if (!config) return
    setConfig({
      ...config,
      poste_italiane: {
        ...config.poste_italiane,
        italia: {
          ...config.poste_italiane.italia,
          ...(field === 'peso_max_kg'
            ? { peso_max_kg: value }
            : {
                formati: {
                  ...config.poste_italiane.italia.formati,
                  [format]: {
                    ...config.poste_italiane.italia.formati[format],
                    [field]: value,
                  },
                },
              }),
        },
      },
    })
  }

  const updatePriceTier = (
    carrier: 'gls' | 'brt' | 'poste_italiane',
    format: 'standard' | 'non_standard' | null,
    tierIndex: number,
    field: 'max_kg' | 'prezzo',
    value: number
  ) => {
    if (!config) return

    if (carrier === 'gls') {
      const newPrezzi = [...config.gls.italia.prezzi_eur]
      newPrezzi[tierIndex] = { ...newPrezzi[tierIndex], [field]: value }
      updateGLS('prezzi_eur', newPrezzi)
    } else if (carrier === 'brt') {
      const newPrezzi = [...config.brt.italia.prezzi_eur]
      newPrezzi[tierIndex] = { ...newPrezzi[tierIndex], [field]: value }
      updateBRT('prezzi_eur', newPrezzi)
    } else if (carrier === 'poste_italiane' && format) {
      const newPrezzi = [...config.poste_italiane.italia.formati[format].prezzi_eur]
      newPrezzi[tierIndex] = { ...newPrezzi[tierIndex], [field]: value }
      updatePoste(format, 'prezzi_eur', newPrezzi)
    }
  }

  const addPriceTier = (carrier: 'gls' | 'brt' | 'poste_italiane', format: 'standard' | 'non_standard' | null) => {
    if (!config) return

    if (carrier === 'gls') {
      const newPrezzi = [...config.gls.italia.prezzi_eur, { max_kg: 30, prezzo: 20.00 }]
      updateGLS('prezzi_eur', newPrezzi)
    } else if (carrier === 'brt') {
      const newPrezzi = [...config.brt.italia.prezzi_eur, { max_kg: 30, prezzo: 20.00 }]
      updateBRT('prezzi_eur', newPrezzi)
    } else if (carrier === 'poste_italiane' && format) {
      const newPrezzi = [...config.poste_italiane.italia.formati[format].prezzi_eur, { max_kg: 20, prezzo: 25.00 }]
      updatePoste(format, 'prezzi_eur', newPrezzi)
    }
  }

  const removePriceTier = (carrier: 'gls' | 'brt' | 'poste_italiane', format: 'standard' | 'non_standard' | null, tierIndex: number) => {
    if (!config) return

    if (carrier === 'gls') {
      const newPrezzi = config.gls.italia.prezzi_eur.filter((_, i) => i !== tierIndex)
      updateGLS('prezzi_eur', newPrezzi)
    } else if (carrier === 'brt') {
      const newPrezzi = config.brt.italia.prezzi_eur.filter((_, i) => i !== tierIndex)
      updateBRT('prezzi_eur', newPrezzi)
    } else if (carrier === 'poste_italiane' && format) {
      const newPrezzi = config.poste_italiane.italia.formati[format].prezzi_eur.filter((_, i) => i !== tierIndex)
      updatePoste(format, 'prezzi_eur', newPrezzi)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento configurazione corrieri...</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Errore nel caricamento configurazione</p>
        <Link href="/admin/spedizioni" className="text-primary-600 hover:text-primary-700 font-medium">
          Torna alle impostazioni spedizione
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/spedizioni"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiX className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold flex items-center">
            <FiPackage className="mr-3" /> Configurazione Corrieri
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiSave className="w-4 h-4" />
          <span>{saving ? 'Salvataggio...' : 'Salva Configurazione'}</span>
        </button>
      </div>

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

      <div className="space-y-6">
        {/* GLS */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">GLS</h2>
            <button
              onClick={() => setEditingCarrier(editingCarrier === 'gls' ? null : 'gls')}
              className="flex items-center space-x-2 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
            >
              {editingCarrier === 'gls' ? (
                <>
                  <FiCheck className="w-4 h-4" />
                  <span>Chiudi</span>
                </>
              ) : (
                <>
                  <FiEdit className="w-4 h-4" />
                  <span>Modifica</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso Max (kg)</label>
              <input
                type="number"
                value={config.gls.italia.peso_max_kg}
                onChange={(e) => updateGLS('peso_max_kg', parseFloat(e.target.value) || 0)}
                disabled={editingCarrier !== 'gls'}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lato Max (cm)</label>
              <input
                type="number"
                value={config.gls.italia.dimensioni.lato_max_cm}
                onChange={(e) => updateGLS('dimensioni', { ...config.gls.italia.dimensioni, lato_max_cm: parseFloat(e.target.value) || 0 })}
                disabled={editingCarrier !== 'gls'}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Somma Lati (cm)</label>
              <input
                type="number"
                value={config.gls.italia.dimensioni.somma_lati_cm}
                onChange={(e) => updateGLS('dimensioni', { ...config.gls.italia.dimensioni, somma_lati_cm: parseFloat(e.target.value) || 0 })}
                disabled={editingCarrier !== 'gls'}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Prezzi per Fasce di Peso</label>
              {editingCarrier === 'gls' && (
                <button
                  onClick={() => addPriceTier('gls', null)}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  + Aggiungi Fascia
                </button>
              )}
            </div>
            <div className="space-y-2">
              {config.gls.italia.prezzi_eur.map((tier, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={tier.max_kg}
                    onChange={(e) => updatePriceTier('gls', null, index, 'max_kg', parseFloat(e.target.value) || 0)}
                    disabled={editingCarrier !== 'gls'}
                    className="w-24 px-2 py-1 border rounded disabled:bg-gray-100"
                    placeholder="Max kg"
                  />
                  <span className="text-gray-600">kg:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tier.prezzo}
                    onChange={(e) => updatePriceTier('gls', null, index, 'prezzo', parseFloat(e.target.value) || 0)}
                    disabled={editingCarrier !== 'gls'}
                    className="w-32 px-2 py-1 border rounded disabled:bg-gray-100"
                    placeholder="Prezzo €"
                  />
                  {editingCarrier === 'gls' && config.gls.italia.prezzi_eur.length > 1 && (
                    <button
                      onClick={() => removePriceTier('gls', null, index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BRT */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">BRT</h2>
            <button
              onClick={() => setEditingCarrier(editingCarrier === 'brt' ? null : 'brt')}
              className="flex items-center space-x-2 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
            >
              {editingCarrier === 'brt' ? (
                <>
                  <FiCheck className="w-4 h-4" />
                  <span>Chiudi</span>
                </>
              ) : (
                <>
                  <FiEdit className="w-4 h-4" />
                  <span>Modifica</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso Max (kg)</label>
              <input
                type="number"
                value={config.brt.italia.peso_max_kg}
                onChange={(e) => updateBRT('peso_max_kg', parseFloat(e.target.value) || 0)}
                disabled={editingCarrier !== 'brt'}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lato Max (cm)</label>
              <input
                type="number"
                value={config.brt.italia.dimensioni.lato_max_cm}
                onChange={(e) => updateBRT('dimensioni', { ...config.brt.italia.dimensioni, lato_max_cm: parseFloat(e.target.value) || 0 })}
                disabled={editingCarrier !== 'brt'}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Somma Lati (cm)</label>
              <input
                type="number"
                value={config.brt.italia.dimensioni.somma_lati_cm}
                onChange={(e) => updateBRT('dimensioni', { ...config.brt.italia.dimensioni, somma_lati_cm: parseFloat(e.target.value) || 0 })}
                disabled={editingCarrier !== 'brt'}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Prezzi per Fasce di Peso</label>
              {editingCarrier === 'brt' && (
                <button
                  onClick={() => addPriceTier('brt', null)}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  + Aggiungi Fascia
                </button>
              )}
            </div>
            <div className="space-y-2">
              {config.brt.italia.prezzi_eur.map((tier, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={tier.max_kg}
                    onChange={(e) => updatePriceTier('brt', null, index, 'max_kg', parseFloat(e.target.value) || 0)}
                    disabled={editingCarrier !== 'brt'}
                    className="w-24 px-2 py-1 border rounded disabled:bg-gray-100"
                    placeholder="Max kg"
                  />
                  <span className="text-gray-600">kg:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tier.prezzo}
                    onChange={(e) => updatePriceTier('brt', null, index, 'prezzo', parseFloat(e.target.value) || 0)}
                    disabled={editingCarrier !== 'brt'}
                    className="w-32 px-2 py-1 border rounded disabled:bg-gray-100"
                    placeholder="Prezzo €"
                  />
                  {editingCarrier === 'brt' && config.brt.italia.prezzi_eur.length > 1 && (
                    <button
                      onClick={() => removePriceTier('brt', null, index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Poste Italiane */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Poste Italiane</h2>
            <button
              onClick={() => setEditingCarrier(editingCarrier === 'poste' ? null : 'poste')}
              className="flex items-center space-x-2 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
            >
              {editingCarrier === 'poste' ? (
                <>
                  <FiCheck className="w-4 h-4" />
                  <span>Chiudi</span>
                </>
              ) : (
                <>
                  <FiEdit className="w-4 h-4" />
                  <span>Modifica</span>
                </>
              )}
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso Max (kg)</label>
            <input
              type="number"
              value={config.poste_italiane.italia.peso_max_kg}
              onChange={(e) => updatePoste('standard', 'peso_max_kg', parseFloat(e.target.value) || 0)}
              disabled={editingCarrier !== 'poste'}
              className="w-32 px-3 py-2 border rounded-lg disabled:bg-gray-100"
            />
          </div>

          {/* Standard */}
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Formato Standard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lato Max (cm)</label>
                <input
                  type="number"
                  value={config.poste_italiane.italia.formati.standard.dimensioni.lato_max_cm}
                  onChange={(e) => updatePoste('standard', 'dimensioni', { ...config.poste_italiane.italia.formati.standard.dimensioni, lato_max_cm: parseFloat(e.target.value) || 0 })}
                  disabled={editingCarrier !== 'poste'}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Somma Lati (cm)</label>
                <input
                  type="number"
                  value={config.poste_italiane.italia.formati.standard.dimensioni.somma_lati_cm}
                  onChange={(e) => updatePoste('standard', 'dimensioni', { ...config.poste_italiane.italia.formati.standard.dimensioni, somma_lati_cm: parseFloat(e.target.value) || 0 })}
                  disabled={editingCarrier !== 'poste'}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Prezzi per Fasce di Peso</label>
                {editingCarrier === 'poste' && (
                  <button
                    onClick={() => addPriceTier('poste_italiane', 'standard')}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    + Aggiungi Fascia
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {config.poste_italiane.italia.formati.standard.prezzi_eur.map((tier, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={tier.max_kg}
                      onChange={(e) => updatePriceTier('poste_italiane', 'standard', index, 'max_kg', parseFloat(e.target.value) || 0)}
                      disabled={editingCarrier !== 'poste'}
                      className="w-24 px-2 py-1 border rounded disabled:bg-gray-100"
                      placeholder="Max kg"
                    />
                    <span className="text-gray-600">kg:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={tier.prezzo}
                      onChange={(e) => updatePriceTier('poste_italiane', 'standard', index, 'prezzo', parseFloat(e.target.value) || 0)}
                      disabled={editingCarrier !== 'poste'}
                      className="w-32 px-2 py-1 border rounded disabled:bg-gray-100"
                      placeholder="Prezzo €"
                    />
                    {editingCarrier === 'poste' && config.poste_italiane.italia.formati.standard.prezzi_eur.length > 1 && (
                      <button
                        onClick={() => removePriceTier('poste_italiane', 'standard', index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Non Standard */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Formato Non Standard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lato Max (cm)</label>
                <input
                  type="number"
                  value={config.poste_italiane.italia.formati.non_standard.dimensioni.lato_max_cm}
                  onChange={(e) => updatePoste('non_standard', 'dimensioni', { ...config.poste_italiane.italia.formati.non_standard.dimensioni, lato_max_cm: parseFloat(e.target.value) || 0 })}
                  disabled={editingCarrier !== 'poste'}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Somma Lati (cm)</label>
                <input
                  type="number"
                  value={config.poste_italiane.italia.formati.non_standard.dimensioni.somma_lati_cm}
                  onChange={(e) => updatePoste('non_standard', 'dimensioni', { ...config.poste_italiane.italia.formati.non_standard.dimensioni, somma_lati_cm: parseFloat(e.target.value) || 0 })}
                  disabled={editingCarrier !== 'poste'}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Prezzi per Fasce di Peso</label>
                {editingCarrier === 'poste' && (
                  <button
                    onClick={() => addPriceTier('poste_italiane', 'non_standard')}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    + Aggiungi Fascia
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {config.poste_italiane.italia.formati.non_standard.prezzi_eur.map((tier, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={tier.max_kg}
                      onChange={(e) => updatePriceTier('poste_italiane', 'non_standard', index, 'max_kg', parseFloat(e.target.value) || 0)}
                      disabled={editingCarrier !== 'poste'}
                      className="w-24 px-2 py-1 border rounded disabled:bg-gray-100"
                      placeholder="Max kg"
                    />
                    <span className="text-gray-600">kg:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={tier.prezzo}
                      onChange={(e) => updatePriceTier('poste_italiane', 'non_standard', index, 'prezzo', parseFloat(e.target.value) || 0)}
                      disabled={editingCarrier !== 'poste'}
                      className="w-32 px-2 py-1 border rounded disabled:bg-gray-100"
                      placeholder="Prezzo €"
                    />
                    {editingCarrier === 'poste' && config.poste_italiane.italia.formati.non_standard.prezzi_eur.length > 1 && (
                      <button
                        onClick={() => removePriceTier('poste_italiane', 'non_standard', index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

