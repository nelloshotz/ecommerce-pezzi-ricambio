'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { FiStar, FiCheckCircle, FiX } from 'react-icons/fi'

interface Review {
  id: string
  orderId: string
  userId: string
  rating: number
  title?: string | null
  comment?: string | null
  createdAt: string
  updatedAt: string
}

interface ReviewFormProps {
  orderId: string
  orderStatus: string
  onReviewSubmit?: () => void
}

const subjectLabels: Record<string, string> = {
  PROBLEMA_ORDINE: 'Problema con l&apos;ordine',
  PARTI_MANCANTI: 'Parti mancanti',
  ALTRO: 'Altro',
}

export default function ReviewForm({ orderId, orderStatus, onReviewSubmit }: ReviewFormProps) {
  const { user } = useAuthStore()
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const loadReview = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/reviews`)
      if (response.ok) {
        const data = await response.json()
        if (data.review) {
          setReview(data.review)
          setRating(data.review.rating)
          setTitle(data.review.title || '')
          setComment(data.review.comment || '')
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento recensione:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (user && orderStatus === 'DELIVERED') {
      loadReview()
    } else {
      setLoading(false)
    }
  }, [user, orderStatus, loadReview])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!rating) {
      setError('Seleziona un voto')
      return
    }

    if (!user) {
      setError('Devi essere loggato per lasciare una recensione')
      return
    }

    setSubmitting(true)

    try {
      const url = `/api/orders/${orderId}/reviews`
      const method = review ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nel salvataggio recensione')
      }

      const data = await response.json()
      setReview(data.review)
      setEditing(false)
      if (onReviewSubmit) {
        onReviewSubmit()
      }
    } catch (error: any) {
      setError(error.message || 'Errore nel salvataggio recensione')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Caricamento recensione...</p>
      </div>
    )
  }

  if (orderStatus !== 'DELIVERED') {
    return null
  }

  if (review && !editing) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">La Tua Recensione</h2>
            <div className="flex items-center space-x-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`w-5 h-5 ${
                    star <= review.rating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-gray-600">({review.rating}/5)</span>
            </div>
            {review.title && (
              <h3 className="font-medium text-gray-900 mb-2">{review.title}</h3>
            )}
            {review.comment && (
              <p className="text-gray-700">{review.comment}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Recensita il {new Date(review.createdAt).toLocaleDateString('it-IT')}
              {review.updatedAt !== review.createdAt && ' (modificata)'}
            </p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Modifica
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        {review ? 'Modifica Recensione' : 'Lascia una Recensione'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valutazione *
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <FiStar
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-gray-600">({rating}/5)</span>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Titolo (opzionale)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Es. Ottimo prodotto!"
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Commento (opzionale)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Condividi la tua esperienza..."
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">{comment.length}/1000 caratteri</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={submitting || !rating}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCheckCircle className="w-5 h-5" />
            <span>{submitting ? 'Salvataggio...' : review ? 'Aggiorna Recensione' : 'Invia Recensione'}</span>
          </button>
          {review && editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setRating(review.rating)
                setTitle(review.title || '')
                setComment(review.comment || '')
                setError('')
              }}
              className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              <FiX className="w-5 h-5" />
              <span>Annulla</span>
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

