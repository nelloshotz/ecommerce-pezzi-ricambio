'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi'

interface CompanySettings {
  companyName: string
  phone: string
  email: string
  address: string
  city: string
  postalCode: string
  province?: string | null
  country: string
}

export default function Footer() {
  const [companyData, setCompanyData] = useState<CompanySettings | null>(null)
  const [footerContent, setFooterContent] = useState<{
    chiSiamo: string | null
    spedizioni: string | null
    faq: Array<{ domanda: string; risposta: string }>
  } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [companyResponse, footerResponse] = await Promise.all([
          fetch('/api/company/settings', { cache: 'no-store' }),
          fetch('/api/footer/content', { cache: 'no-store' }),
        ])

        if (companyResponse.ok) {
          const companyData = await companyResponse.json()
          setCompanyData(companyData)
        }

        if (footerResponse.ok) {
          const footerData = await footerResponse.json()
          setFooterContent(footerData)
        }
      } catch (error) {
        console.error('Errore nel caricamento dati:', error)
      }
    }

    loadData()
  }, [])

  const fullAddress = companyData
    ? [
        companyData.address,
        companyData.city,
        companyData.postalCode,
        companyData.province,
        companyData.country,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Via Roma 123, 00100 Roma'

  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">MotorPlanet</h3>
            <p className="text-gray-400">
              Il tuo negozio online di fiducia per pezzi di ricambio di qualità
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Link Utili</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/catalogo" className="hover:text-white transition">
                  Catalogo
                </Link>
              </li>
              <li>
                <Link href="/categorie" className="hover:text-white transition">
                  Categorie
                </Link>
              </li>
              {footerContent?.chiSiamo && (
                <li>
                  <Link href="/chi-siamo" className="hover:text-white transition">
                    Chi Siamo
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Assistenza</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/contatti" className="hover:text-white transition">
                  Contatti
                </Link>
              </li>
              {footerContent?.faq && footerContent.faq.length > 0 && (
                <li>
                  <Link href="/faq" className="hover:text-white transition">
                    FAQ
                  </Link>
                </li>
              )}
              {footerContent?.spedizioni && (
                <li>
                  <Link href="/spedizioni" className="hover:text-white transition">
                    Spedizioni
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contatti</h4>
            <ul className="space-y-3 text-gray-400">
              {companyData?.phone && (
                <li className="flex items-center space-x-2">
                  <FiPhone className="w-4 h-4" />
                  <span>{companyData.phone}</span>
                </li>
              )}
              {companyData?.email && (
                <li className="flex items-center space-x-2">
                  <FiMail className="w-4 h-4" />
                  <span>{companyData.email}</span>
                </li>
              )}
              {fullAddress && (
                <li className="flex items-start space-x-2">
                  <FiMapPin className="w-4 h-4 mt-1" />
                  <span>{fullAddress}</span>
                </li>
              )}
              {!companyData && (
                <>
                  <li className="flex items-center space-x-2">
                    <FiPhone className="w-4 h-4" />
                    <span>+39 123 456 7890</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <FiMail className="w-4 h-4" />
                    <span>info@motorplanet.it</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <FiMapPin className="w-4 h-4 mt-1" />
                    <span>Via Roma 123, 00100 Roma</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} MotorPlanet. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  )
}

