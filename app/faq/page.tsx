'use client'

import { useState, useEffect } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

interface FAQItem {
  domanda: string
  risposta: string
}

export default function FAQPage() {
  const [faq, setFaq] = useState<FAQItem[]>([])
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFAQ() {
      try {
        const response = await fetch('/api/footer/content', {
          cache: 'no-store',
        })

        if (response.ok) {
          const data = await response.json()
          setFaq(data.faq || [])
        }
      } catch (error) {
        console.error('Errore nel caricamento FAQ:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFAQ()
  }, [])

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Caricamento...</p>
      </div>
    )
  }

  if (faq.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">FAQ</h1>
          <p className="text-gray-600">Nessuna FAQ disponibile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Domande Frequenti</h1>
        <div className="space-y-4">
          {faq.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition"
              >
                <span className="font-semibold text-gray-900 pr-4">{item.domanda}</span>
                {openIndex === index ? (
                  <FiChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <FiChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {item.risposta}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

