'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiX, FiArrowLeft, FiImage, FiInfo, FiTrash2 } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  order: number
  active: boolean
  productsCount: number
  productTypesCount: number
  createdAt: string
  updatedAt: string
}

export default function ModificaCategoriaPage() {
  const router = useRouter()
  const params = useParams()
  const { user: currentUser } = useAuthStore()
  const categoryId = params.id as string
  const [category, setCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    order: 0,
    active: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadCategory() {
      if (!categoryId || !currentUser?.id) return

      try {
        setLoading(true)
        const response = await fetch(`/api/admin/categories/${categoryId}`, {
          headers: {
            'x-user-id': currentUser.id,
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Errore nel caricamento categoria')
        }

        const data = await response.json()
        if (data.category) {
          const cat = data.category
          setCategory(cat)
          setFormData({
            name: cat.name || '',
            description: cat.description || '',
            image: cat.image || '',
            order: cat.order || 0,
            active: cat.active !== undefined ? cat.active : true,
          })
          setImagePreview(cat.image || '')
        }
      } catch (error) {
        console.error('Errore nel caricamento categoria:', error)
        alert('Errore nel caricamento categoria')
        router.push('/admin/categorie')
      } finally {
        setLoading(false)
      }
    }

    loadCategory()
  }, [categoryId, currentUser?.id, router])

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
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId || !currentUser?.id) return

    setSaving(true)
    setError(null)

    try {
      // Crea FormData se c'è un file immagine, altrimenti JSON
      const hasImage = imageFile
      let body: FormData | string
      let headers: HeadersInit = {
        'x-user-id': currentUser.id,
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

      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers,
        body,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'aggiornamento categoria')
      }

      const data = await response.json()
      alert('Categoria aggiornata con successo!')
      router.push('/admin/categorie')
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error)
      setError(error.message || 'Errore nell\'aggiornamento categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryId || !currentUser?.id) return

    if (category?.productsCount && category.productsCount > 0) {
      alert(`Non puoi eliminare questa categoria perché ha ${category.productsCount} prodotto/i associato/i. Prima sposta i prodotti in un'altra categoria.`)
      return
    }

    if (category?.productTypesCount && category.productTypesCount > 0) {
      alert(`Non puoi eliminare questa categoria perché ha ${category.productTypesCount} tipo/i prodotto associato/i. Prima rimuovi i tipi prodotto.`)
      return
    }

    if (!confirm('Sei sicuro di voler eliminare questa categoria? Questa azione non può essere annullata.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'eliminazione categoria')
      }

      alert('Categoria eliminata con successo!')
      router.push('/admin/categorie')
    } catch (error: any) {
      console.error('Errore nell\'eliminazione categoria:', error)
      alert(error.message || 'Errore nell\'eliminazione categoria')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento categoria...</p>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Categoria non trovata</p>
        <Link
          href="/admin/categorie"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Torna alla lista categorie
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/categorie"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Modifica Categoria</h1>
            <p className="text-gray-600">{category.name}</p>
          </div>
        </div>
        {category.productsCount === 0 && category.productTypesCount === 0 && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiTrash2 className="w-4 h-4" />
            <span>{deleting ? 'Eliminazione...' : 'Elimina'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {category.productsCount > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="font-medium mb-1">Attenzione:</p>
          <p>
            Questa categoria ha {category.productsCount} prodotto/i associato/i. 
            Non puoi eliminarla finché non sposti tutti i prodotti in un'altra categoria.
          </p>
        </div>
      )}

      {category.productTypesCount > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="font-medium mb-1">Attenzione:</p>
          <p>
            Questa categoria ha {category.productTypesCount} tipo/i prodotto associato/i. 
            Non puoi eliminarla finché non rimuovi tutti i tipi prodotto associati.
          </p>
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
              Lo slug verrà rigenerato automaticamente se modifichi il nome
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
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value })
                    setImagePreview(e.target.value)
                  }}
                  className="w-full mt-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Oppure inserisci URL immagine"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, image: '' })
                    setImagePreview(category.image || '')
                    setImageFile(null)
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Rimuovi immagine
                </button>
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

          {/* Info Categoria */}
          <div className="md:col-span-2 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Slug:</span>
                <span className="ml-2 font-mono text-gray-900">{category.slug}</span>
              </div>
              <div>
                <span className="text-gray-600">Prodotti associati:</span>
                <span className="ml-2 font-medium text-gray-900">{category.productsCount}</span>
              </div>
              <div>
                <span className="text-gray-600">Creato il:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(category.createdAt).toLocaleDateString('it-IT')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Modificato il:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(category.updatedAt).toLocaleDateString('it-IT')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="flex items-center space-x-4 pt-6 mt-6 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
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

