'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiX, FiArrowLeft, FiImage, FiInfo } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'

export default function NuovaCategoriaPage() {
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    order: 0,
    active: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Verifica tipo file (solo immagini)
      if (!file.type.startsWith('image/')) {
        alert('Il file deve essere un\'immagine')
        return
      }

      // Verifica dimensione (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Il file è troppo grande (massimo 5MB)')
        return
      }

      setImageFile(file)

      // Crea preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
        setFormData({ ...formData, image: e.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Crea FormData se c'è un file immagine, altrimenti JSON
      const hasImage = imageFile
      let body: FormData | string
      let headers: HeadersInit = {
        'x-user-id': currentUser?.id || '',
      }

      if (hasImage && imageFile) {
        const formDataToSend = new FormData()
        formDataToSend.append('name', formData.name)
        formDataToSend.append('description', formData.description || '')
        formDataToSend.append('order', String(formData.order || 0))
        formDataToSend.append('active', String(formData.active))
        formDataToSend.append('image', imageFile)
        body = formDataToSend
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          image: formData.image || null,
          order: formData.order || 0,
          active: formData.active,
        })
      }

      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          ...headers,
          'x-user-id': currentUser?.id || '',
        },
        body,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nel salvataggio della categoria')
      }

      const data = await response.json()
      alert('Categoria creata con successo!')
      router.push('/admin/categorie')
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error)
      setError(error.message || 'Errore nel salvataggio della categoria')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center space-x-4 mb-8">
        <Link
          href="/admin/categorie"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Nuova Categoria</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome Categoria */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Categoria *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. Ricambi Auto"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lo slug verrà generato automaticamente dal nome
            </p>
          </div>

          {/* Descrizione */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Descrizione della categoria"
            />
          </div>

          {/* Immagine */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Immagine Categoria
            </label>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {imagePreview || formData.image ? (
                  <Image
                    src={imagePreview || formData.image}
                    alt="Preview"
                    width={120}
                    height={120}
                    className="rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-30 h-30 bg-gray-200 rounded-lg flex items-center justify-center border">
                    <FiImage className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formati supportati: JPG, PNG, GIF. Massimo 5MB.
                </p>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full mt-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Oppure inserisci URL immagine"
                />
              </div>
            </div>
          </div>

          {/* Ordine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordine Visualizzazione
            </label>
            <input
              type="number"
              min="0"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Categorie con ordine inferiore vengono mostrate per prime
            </p>
          </div>

          {/* Stato Attivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stato
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Categoria attiva</span>
            </label>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-start space-x-2">
              <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Nota:</p>
                <p>
                  Le categorie inattive non vengono mostrate nel catalogo pubblico, ma possono essere utilizzate per organizzare i prodotti nell'admin.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="flex items-center space-x-4 pt-6 mt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{loading ? 'Salvataggio...' : 'Salva Categoria'}</span>
          </button>
          <Link
            href="/admin/categorie"
            className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <FiX className="w-4 h-4" />
            <span>Annulla</span>
          </Link>
        </div>
      </form>
    </div>
  )
}

