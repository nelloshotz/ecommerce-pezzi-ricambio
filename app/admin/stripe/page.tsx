'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiCheckCircle, FiXCircle, FiAlertTriangle, FiLock, FiGlobe, FiEye, FiEyeOff } from 'react-icons/fi'
import { loadStripe } from '@stripe/stripe-js'

interface StripeConfig {
  id?: string
  publishableKey: string
  secretKey: string
  secretKeyFull?: string
  webhookSecret: string
  isTestMode: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export default function AdminStripePage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated } = useAuthStore()
  const [config, setConfig] = useState<StripeConfig>({
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
    isTestMode: true,
    isActive: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [testingCredentials, setTestingCredentials] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'admin') {
      router.push('/')
      return
    }

    loadConfig()
  }, [currentUser, isAuthenticated, router])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stripe/config', {
        headers: {
          'x-user-id': currentUser?.id || '',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Errore nel caricamento configurazione')
      }

      const data = await response.json()
      if (data.config) {
        setConfig({
          ...data.config,
          secretKey: data.config.secretKeyFull || data.config.secretKey || '',
        })
      }
    } catch (error: any) {
      console.error('Errore nel caricamento configurazione:', error)
      setError('Errore nel caricamento configurazione Stripe')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/stripe/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nel salvataggio configurazione')
      }

      const data = await response.json()
      setSuccess(data.message || 'Configurazione Stripe salvata con successo!')
      
      // Aggiorna config con dati salvati
      if (data.config) {
        setConfig({
          ...data.config,
          secretKey: config.secretKey, // Mantieni il valore inserito
        })
      }

      // Ricarica configurazione
      await loadConfig()
    } catch (error: any) {
      console.error('Errore nel salvataggio configurazione:', error)
      setError(error.message || 'Errore nel salvataggio configurazione Stripe')
    } finally {
      setSaving(false)
    }
  }

  const handleTestCredentials = async () => {
    if (!config.publishableKey || !config.secretKey) {
      setError('Inserisci Publishable Key e Secret Key per testare')
      return
    }

    setTestingCredentials(true)
    setError('')
    setSuccess('')

    try {
      // Testa Publishable Key caricando Stripe
      const stripe = await loadStripe(config.publishableKey)
      
      if (!stripe) {
        throw new Error('Publishable Key non valida')
      }

      // Testa Secret Key facendo una chiamata API
      const response = await fetch('/api/admin/stripe/test-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          secretKey: config.secretKey,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Credenziali non valide')
      }

      setSuccess('✅ Credenziali Stripe valide e funzionanti!')
    } catch (error: any) {
      console.error('Errore nel test credenziali:', error)
      setError(`Errore nel test credenziali: ${error.message}`)
    } finally {
      setTestingCredentials(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento configurazione...</p>
      </div>
    )
  }

  const isTestMode = config.publishableKey?.startsWith('pk_test_') || config.isTestMode

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configurazione Stripe</h1>
        <p className="text-gray-600">
          Configura le credenziali Stripe per abilitare i pagamenti online
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start space-x-2">
          <FiAlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Errore</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-start space-x-2">
          <FiCheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Successo</p>
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <FiGlobe className="w-5 h-5 mr-2" />
            Informazioni su Stripe
          </h3>
          <p className="text-sm text-blue-800 mb-2">
            Per ottenere le credenziali Stripe:
          </p>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1 ml-2">
            <li>Registrati su <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline">stripe.com</a></li>
            <li>Accedi al Dashboard Stripe</li>
            <li>Vai in "Developers" → "API keys"</li>
            <li>Copia la <strong>Publishable key</strong> (inizia con pk_test_ o pk_live_)</li>
            <li>Copia la <strong>Secret key</strong> (inizia con sk_test_ o sk_live_)</li>
            <li>Per webhook, vai in "Developers" → "Webhooks" e copia il "Signing secret"</li>
          </ol>
        </div>

        {config.isActive && (
          <div className={`mb-4 p-4 rounded-lg border ${
            isTestMode
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center space-x-2">
              {isTestMode ? (
                <>
                  <FiAlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Modalità Test Attiva</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="w-5 h-5" />
                  <span className="font-medium">Modalità Live Attiva</span>
                </>
              )}
            </div>
            <p className="text-sm mt-1">
              {isTestMode
                ? 'Stai usando credenziali di test. I pagamenti non saranno reali.'
                : 'ATTENZIONE: Modalità Live attiva. I pagamenti saranno reali!'}
            </p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Publishable Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publishable Key *
            </label>
            <input
              type="text"
              required
              value={config.publishableKey}
              onChange={(e) =>
                setConfig({ ...config, publishableKey: e.target.value.trim() })
              }
              placeholder="pk_test_... o pk_live_..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Chiave pubblica Stripe (visibile nel frontend)
            </p>
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret Key *
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                required
                value={config.secretKey}
                onChange={(e) =>
                  setConfig({ ...config, secretKey: e.target.value.trim() })
                }
                placeholder="sk_test_... o sk_live_..."
                className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title={showSecretKey ? 'Nascondi chiave' : 'Mostra chiave'}
              >
                {showSecretKey ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Chiave segreta Stripe (NON condividere questa chiave!)
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook Secret
            </label>
            <input
              type="password"
              value={config.webhookSecret}
              onChange={(e) =>
                setConfig({ ...config, webhookSecret: e.target.value.trim() })
              }
              placeholder="whsec_... (opzionale, necessario per webhook)"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Signing secret per verificare eventi webhook (opzionale ma consigliato)
            </p>
          </div>

          {/* Test Mode */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.isTestMode}
                onChange={(e) =>
                  setConfig({ ...config, isTestMode: e.target.checked })
                }
                disabled={!config.publishableKey || !config.secretKey}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Modalità Test</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              {config.isTestMode
                ? 'Usa credenziali di test (pk_test_ e sk_test_)'
                : 'Usa credenziali live (pk_live_ e sk_live_)'}
            </p>
          </div>

          {/* Attiva Configurazione */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.isActive}
                onChange={(e) =>
                  setConfig({ ...config, isActive: e.target.checked })
                }
                disabled={!config.publishableKey || !config.secretKey}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 font-medium">Attiva questa configurazione</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Solo una configurazione può essere attiva alla volta
            </p>
          </div>

          {/* Bottoni */}
          <div className="flex items-center space-x-4 pt-4 border-t">
            <button
              type="submit"
              disabled={saving || !config.publishableKey || !config.secretKey}
              className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <FiSave className="w-5 h-5" />
              <span>{saving ? 'Salvataggio...' : 'Salva Configurazione'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestCredentials}
              disabled={testingCredentials || !config.publishableKey || !config.secretKey}
              className="flex items-center space-x-2 px-6 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {testingCredentials ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Test in corso...</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="w-5 h-5" />
                  <span>Testa Credenziali</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Istruzioni Webhook */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Configurazione Webhook Stripe</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Per ricevere notifiche automatiche sui pagamenti, configura un webhook su Stripe:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Vai nel Dashboard Stripe → "Developers" → "Webhooks"</li>
            <li>Clicca "Add endpoint"</li>
            <li>
              Endpoint URL: <code className="bg-gray-100 px-2 py-1 rounded">https://tuodominio.com/api/webhooks/stripe</code>
            </li>
            <li>Seleziona gli eventi: <code className="bg-gray-100 px-2 py-1 rounded">payment_intent.succeeded</code> e <code className="bg-gray-100 px-2 py-1 rounded">payment_intent.payment_failed</code></li>
            <li>Copia il "Signing secret" e inseriscilo nel campo Webhook Secret sopra</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-xs">
              <strong>Nota:</strong> In sviluppo locale, usa Stripe CLI per testare i webhook:
              <code className="block mt-1 bg-gray-100 px-2 py-1 rounded font-mono">
                stripe listen --forward-to localhost:3000/api/webhooks/stripe
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

