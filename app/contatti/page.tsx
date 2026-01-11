'use client'

import { useState, useEffect } from 'react'
import { FiPhone, FiMail, FiMapPin, FiGlobe } from 'react-icons/fi'

interface CompanySettings {
  companyName: string
  vatNumber?: string | null
  taxCode?: string | null
  address: string
  city: string
  postalCode: string
  province?: string | null
  country: string
  phone: string
  email: string
  website?: string | null
  notes?: string | null
}

export default function ContattiPage() {
  const [companyData, setCompanyData] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompanyData() {
      try {
        const response = await fetch('/api/company/settings', {
          cache: 'no-store',
        })

        if (response.ok) {
          const data = await response.json()
          setCompanyData(data)
        }
      } catch (error) {
        console.error('Errore nel caricamento dati azienda:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCompanyData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Caricamento informazioni...</p>
      </div>
    )
  }

  if (!companyData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Informazioni non disponibili</p>
      </div>
    )
  }

  const fullAddress = [
    companyData.address,
    companyData.city,
    companyData.postalCode,
    companyData.province,
    companyData.country,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Contatti</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-6">{companyData.companyName || 'MotorPlanet'}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Telefono */}
            {companyData.phone && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <FiPhone className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Telefono</h3>
                  <a
                    href={`tel:${companyData.phone}`}
                    className="text-gray-700 hover:text-primary-600 transition"
                  >
                    {companyData.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {companyData.email && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <FiMail className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <a
                    href={`mailto:${companyData.email}`}
                    className="text-gray-700 hover:text-primary-600 transition"
                  >
                    {companyData.email}
                  </a>
                </div>
              </div>
            )}

            {/* Indirizzo */}
            {fullAddress && (
              <div className="flex items-start space-x-3 md:col-span-2">
                <div className="flex-shrink-0 mt-1">
                  <FiMapPin className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Indirizzo</h3>
                  <p className="text-gray-700">{fullAddress}</p>
                </div>
              </div>
            )}

            {/* Sito Web */}
            {companyData.website && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <FiGlobe className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Sito Web</h3>
                  <a
                    href={companyData.website.startsWith('http') ? companyData.website : `https://${companyData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:text-primary-600 transition"
                  >
                    {companyData.website}
                  </a>
                </div>
              </div>
            )}

            {/* Partita IVA */}
            {companyData.vatNumber && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <span className="text-primary-600 font-semibold">P.IVA</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Partita IVA</h3>
                  <p className="text-gray-700">{companyData.vatNumber}</p>
                </div>
              </div>
            )}

            {/* Codice Fiscale */}
            {companyData.taxCode && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <span className="text-primary-600 font-semibold">C.F.</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Codice Fiscale</h3>
                  <p className="text-gray-700">{companyData.taxCode}</p>
                </div>
              </div>
            )}
          </div>

          {/* Note aggiuntive */}
          {companyData.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Note</h3>
              <p className="text-gray-700 whitespace-pre-line">{companyData.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

