'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiMail, FiLock, FiUser, FiPhone, FiMapPin, FiHome, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

interface FormData {
  // Dati Account
  email: string
  password: string
  confirmPassword: string
  name: string
  phone: string
  userType: 'PRIVATE' | 'COMPANY'

  // Dati Azienda (se userType === 'COMPANY')
  companyName: string
  companyAddress: string
  companyTaxCode: string
  companyPec: string

  // Dati Indirizzo Spedizione
  shippingFirstName: string
  shippingLastName: string
  shippingEmail: string
  shippingPhone: string
  shippingAddress: string
  shippingCity: string
  shippingPostalCode: string
  shippingProvince: string
  shippingCountry: string

  // Indirizzo Fatturazione (opzionale, usa spedizione se vuoto)
  useSameAddress: boolean
  billingFirstName: string
  billingLastName: string
  billingEmail: string
  billingPhone: string
  billingAddress: string
  billingCity: string
  billingPostalCode: string
  billingProvince: string
  billingCountry: string
}

export default function RegistrazionePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    userType: 'PRIVATE',

    // Dati Azienda
    companyName: '',
    companyAddress: '',
    companyTaxCode: '',
    companyPec: '',

    shippingFirstName: '',
    shippingLastName: '',
    shippingEmail: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPostalCode: '',
    shippingProvince: '',
    shippingCountry: 'Italia',

    useSameAddress: true,
    billingFirstName: '',
    billingLastName: '',
    billingEmail: '',
    billingPhone: '',
    billingAddress: '',
    billingCity: '',
    billingPostalCode: '',
    billingProvince: '',
    billingCountry: 'Italia',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validazione account
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = 'Email non valida'
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password deve essere di almeno 6 caratteri'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Le password non corrispondono'
    }
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Nome deve essere di almeno 2 caratteri'
    }
    if (!formData.phone) {
      newErrors.phone = 'Telefono obbligatorio'
    }

    // Validazione dati azienda (se userType === 'COMPANY')
    if (formData.userType === 'COMPANY') {
      if (!formData.companyName || formData.companyName.trim().length === 0) {
        newErrors.companyName = 'Ragione sociale obbligatoria'
      }
      if (!formData.companyAddress || formData.companyAddress.trim().length === 0) {
        newErrors.companyAddress = 'Indirizzo obbligatorio'
      }
      if (!formData.companyTaxCode || formData.companyTaxCode.trim().length === 0) {
        newErrors.companyTaxCode = 'Codice fiscale o partita IVA obbligatorio'
      }
      // PEC è opzionale, non serve validazione
    }

    // Validazione indirizzo spedizione
    if (!formData.shippingFirstName) newErrors.shippingFirstName = 'Nome obbligatorio'
    if (!formData.shippingLastName) newErrors.shippingLastName = 'Cognome obbligatorio'
    if (!formData.shippingEmail || !formData.shippingEmail.includes('@')) {
      newErrors.shippingEmail = 'Email spedizione non valida'
    }
    if (!formData.shippingPhone) newErrors.shippingPhone = 'Telefono spedizione obbligatorio'
    if (!formData.shippingAddress) newErrors.shippingAddress = 'Indirizzo obbligatorio'
    if (!formData.shippingCity) newErrors.shippingCity = 'Città obbligatoria'
    if (!formData.shippingPostalCode) newErrors.shippingPostalCode = 'CAP obbligatorio'
    if (!formData.shippingCountry) newErrors.shippingCountry = 'Nazione obbligatoria'

    // Validazione indirizzo fatturazione (se diverso)
    if (!formData.useSameAddress) {
      if (!formData.billingFirstName) newErrors.billingFirstName = 'Nome obbligatorio'
      if (!formData.billingLastName) newErrors.billingLastName = 'Cognome obbligatorio'
      if (!formData.billingEmail || !formData.billingEmail.includes('@')) {
        newErrors.billingEmail = 'Email fatturazione non valida'
      }
      if (!formData.billingPhone) newErrors.billingPhone = 'Telefono fatturazione obbligatorio'
      if (!formData.billingAddress) newErrors.billingAddress = 'Indirizzo obbligatorio'
      if (!formData.billingCity) newErrors.billingCity = 'Città obbligatoria'
      if (!formData.billingPostalCode) newErrors.billingPostalCode = 'CAP obbligatorio'
      if (!formData.billingCountry) newErrors.billingCountry = 'Nazione obbligatoria'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la registrazione')
      }

      alert('Registrazione completata con successo! Ora puoi effettuare il login.')
      router.push('/login')
    } catch (error: any) {
      console.error('Errore registrazione:', error)
      setErrors({ submit: error.message || 'Errore durante la registrazione. Riprova.' })
    } finally {
      setLoading(false)
    }
  }

  const handleUseSameAddressChange = (checked: boolean) => {
    setFormData({
      ...formData,
      useSameAddress: checked,
      // Se attivo, copia i dati di spedizione in fatturazione
      ...(checked && {
        billingFirstName: formData.shippingFirstName,
        billingLastName: formData.shippingLastName,
        billingEmail: formData.shippingEmail,
        billingPhone: formData.shippingPhone,
        billingAddress: formData.shippingAddress,
        billingCity: formData.shippingCity,
        billingPostalCode: formData.shippingPostalCode,
        billingProvince: formData.shippingProvince,
        billingCountry: formData.shippingCountry,
      }),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Crea il tuo account su MotorPlanet
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Oppure{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              accedi al tuo account esistente
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-8">
          {errors.submit && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <FiAlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sezione Account */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FiUser className="mr-2" />
              Dati Account
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Mario Rossi"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-3 py-2 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="mario.rossi@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-3 py-2 border ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="+39 333 1234567"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-3 py-2 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Conferma Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`appearance-none relative block w-full pl-10 pr-3 py-2 border ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Ripeti la password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sezione Tipo Utente */}
          <div className="mb-8 border-t pt-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FiUser className="mr-2" />
              Tipo Account
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="userType"
                  value="PRIVATE"
                  checked={formData.userType === 'PRIVATE'}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value as 'PRIVATE' | 'COMPANY' })}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Privato</span>
                  <p className="text-sm text-gray-500">Registrazione come persona fisica</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="userType"
                  value="COMPANY"
                  checked={formData.userType === 'COMPANY'}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value as 'PRIVATE' | 'COMPANY' })}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Azienda</span>
                  <p className="text-sm text-gray-500">Registrazione come persona giuridica</p>
                </div>
              </label>
            </div>
          </div>

          {/* Sezione Dati Azienda (solo se userType === 'COMPANY') */}
          {formData.userType === 'COMPANY' && (
            <div className="mb-8 border-t pt-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <FiHome className="mr-2" />
                Dati Azienda
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Ragione Sociale *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    required={formData.userType === 'COMPANY'}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.companyName ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Es. MotorPlanet S.r.l."
                  />
                  {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo Azienda *
                  </label>
                  <input
                    id="companyAddress"
                    type="text"
                    required={formData.userType === 'COMPANY'}
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.companyAddress ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="Via Roma 123, 00100 Roma"
                  />
                  {errors.companyAddress && <p className="mt-1 text-sm text-red-600">{errors.companyAddress}</p>}
                </div>

                <div>
                  <label htmlFor="companyTaxCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Codice Fiscale / Partita IVA *
                  </label>
                  <input
                    id="companyTaxCode"
                    type="text"
                    required={formData.userType === 'COMPANY'}
                    value={formData.companyTaxCode}
                    onChange={(e) => setFormData({ ...formData, companyTaxCode: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.companyTaxCode ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    placeholder="IT12345678901"
                  />
                  {errors.companyTaxCode && <p className="mt-1 text-sm text-red-600">{errors.companyTaxCode}</p>}
                </div>

                <div>
                  <label htmlFor="companyPec" className="block text-sm font-medium text-gray-700 mb-1">
                    PEC (Opzionale)
                  </label>
                  <input
                    id="companyPec"
                    type="email"
                    value={formData.companyPec}
                    onChange={(e) => setFormData({ ...formData, companyPec: e.target.value })}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="azienda@pec.it"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sezione Indirizzo Spedizione */}
          <div className="mb-8 border-t pt-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FiHome className="mr-2" />
              Indirizzo di Spedizione
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shippingFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  id="shippingFirstName"
                  type="text"
                  required
                  value={formData.shippingFirstName}
                  onChange={(e) => setFormData({ ...formData, shippingFirstName: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingFirstName ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.shippingFirstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingFirstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="shippingLastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Cognome *
                </label>
                <input
                  id="shippingLastName"
                  type="text"
                  required
                  value={formData.shippingLastName}
                  onChange={(e) => setFormData({ ...formData, shippingLastName: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingLastName ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.shippingLastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingLastName}</p>
                )}
              </div>

              <div>
                <label htmlFor="shippingEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="shippingEmail"
                  type="email"
                  required
                  value={formData.shippingEmail}
                  onChange={(e) => setFormData({ ...formData, shippingEmail: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingEmail ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.shippingEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingEmail}</p>
                )}
              </div>

              <div>
                <label htmlFor="shippingPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono *
                </label>
                <input
                  id="shippingPhone"
                  type="tel"
                  required
                  value={formData.shippingPhone}
                  onChange={(e) => setFormData({ ...formData, shippingPhone: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingPhone ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.shippingPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingPhone}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo *
                </label>
                <input
                  id="shippingAddress"
                  type="text"
                  required
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingAddress ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  placeholder="Via Roma 123"
                />
                {errors.shippingAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingAddress}</p>
                )}
              </div>

              <div>
                <label htmlFor="shippingCity" className="block text-sm font-medium text-gray-700 mb-1">
                  Città *
                </label>
                <input
                  id="shippingCity"
                  type="text"
                  required
                  value={formData.shippingCity}
                  onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingCity ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.shippingCity && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingCity}</p>
                )}
              </div>

              <div>
                <label htmlFor="shippingPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                  CAP *
                </label>
                <input
                  id="shippingPostalCode"
                  type="text"
                  required
                  value={formData.shippingPostalCode}
                  onChange={(e) => setFormData({ ...formData, shippingPostalCode: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingPostalCode ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.shippingPostalCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingPostalCode}</p>
                )}
              </div>

              <div>
                <label htmlFor="shippingProvince" className="block text-sm font-medium text-gray-700 mb-1">
                  Provincia
                </label>
                <input
                  id="shippingProvince"
                  type="text"
                  value={formData.shippingProvince}
                  onChange={(e) => setFormData({ ...formData, shippingProvince: e.target.value })}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="RM"
                  maxLength={2}
                />
              </div>

              <div>
                <label htmlFor="shippingCountry" className="block text-sm font-medium text-gray-700 mb-1">
                  Nazione *
                </label>
                <input
                  id="shippingCountry"
                  type="text"
                  required
                  value={formData.shippingCountry}
                  onChange={(e) => setFormData({ ...formData, shippingCountry: e.target.value })}
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.shippingCountry ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                />
                {errors.shippingCountry && (
                  <p className="mt-1 text-sm text-red-600">{errors.shippingCountry}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sezione Indirizzo Fatturazione */}
          <div className="mb-8 border-t pt-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FiMapPin className="mr-2" />
              Indirizzo di Fatturazione
            </h3>
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.useSameAddress}
                  onChange={(e) => handleUseSameAddressChange(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Usa lo stesso indirizzo per la fatturazione
                </span>
              </label>
            </div>

            {!formData.useSameAddress && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billingFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    id="billingFirstName"
                    type="text"
                    required={!formData.useSameAddress}
                    value={formData.billingFirstName}
                    onChange={(e) => setFormData({ ...formData, billingFirstName: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingFirstName ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingFirstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingFirstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billingLastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Cognome *
                  </label>
                  <input
                    id="billingLastName"
                    type="text"
                    required={!formData.useSameAddress}
                    value={formData.billingLastName}
                    onChange={(e) => setFormData({ ...formData, billingLastName: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingLastName ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingLastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingLastName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billingEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="billingEmail"
                    type="email"
                    required={!formData.useSameAddress}
                    value={formData.billingEmail}
                    onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingEmail ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billingPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono *
                  </label>
                  <input
                    id="billingPhone"
                    type="tel"
                    required={!formData.useSameAddress}
                    value={formData.billingPhone}
                    onChange={(e) => setFormData({ ...formData, billingPhone: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingPhone ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingPhone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo *
                  </label>
                  <input
                    id="billingAddress"
                    type="text"
                    required={!formData.useSameAddress}
                    value={formData.billingAddress}
                    onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingAddress ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingAddress}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billingCity" className="block text-sm font-medium text-gray-700 mb-1">
                    Città *
                  </label>
                  <input
                    id="billingCity"
                    type="text"
                    required={!formData.useSameAddress}
                    value={formData.billingCity}
                    onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingCity ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingCity && <p className="mt-1 text-sm text-red-600">{errors.billingCity}</p>}
                </div>

                <div>
                  <label htmlFor="billingPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    CAP *
                  </label>
                  <input
                    id="billingPostalCode"
                    type="text"
                    required={!formData.useSameAddress}
                    value={formData.billingPostalCode}
                    onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingPostalCode ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingPostalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingPostalCode}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billingProvince" className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia
                  </label>
                  <input
                    id="billingProvince"
                    type="text"
                    value={formData.billingProvince}
                    onChange={(e) => setFormData({ ...formData, billingProvince: e.target.value })}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label htmlFor="billingCountry" className="block text-sm font-medium text-gray-700 mb-1">
                    Nazione *
                  </label>
                  <input
                    id="billingCountry"
                    type="text"
                    required={!formData.useSameAddress}
                    value={formData.billingCountry}
                    onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })}
                    className={`appearance-none relative block w-full px-3 py-2 border ${
                      errors.billingCountry ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  />
                  {errors.billingCountry && (
                    <p className="mt-1 text-sm text-red-600">{errors.billingCountry}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="border-t pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Registrazione in corso...'
              ) : (
                <>
                  <FiCheckCircle className="mr-2 h-5 w-5" />
                  Registrati
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

