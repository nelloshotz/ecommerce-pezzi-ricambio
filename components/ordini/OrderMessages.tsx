'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { FiMessageCircle, FiSend, FiImage, FiX, FiUser, FiShield } from 'react-icons/fi'
import Image from 'next/image'

interface MessageAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

interface OrderMessage {
  id: string
  orderId: string
  userId?: string | null
  adminId?: string | null
  subject: string
  message: string
  isRead: boolean
  isReadByUser: boolean
  isReadByAdmin: boolean
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
  } | null
  admin?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  attachments: MessageAttachment[]
}

interface OrderMessagesProps {
  orderId: string
  orderStatus: string
}

const SUBJECT_OPTIONS = [
  { value: 'PROBLEMA_ORDINE', label: 'Problema con l&apos;ordine' },
  { value: 'PARTI_MANCANTI', label: 'Parti mancanti' },
  { value: 'ALTRO', label: 'Altro' },
]

export default function OrderMessages({ orderId, orderStatus }: OrderMessagesProps) {
  const { user, isAdmin } = useAuthStore()
  const [messages, setMessages] = useState<OrderMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isFirstMessage, setIsFirstMessage] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const isAdminUser = isAdmin()
      const response = await fetch(
        `/api/orders/${orderId}/messages?userId=${user.id}&isAdmin=${isAdminUser}`
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        
        // Se non ci sono messaggi, il prossimo sarà il primo
        if (data.messages.length === 0 && !isAdminUser) {
          setIsFirstMessage(true)
          setShowForm(true)
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento messaggi:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId, user, isAdmin])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles: File[] = []
    const previews: string[] = []

    files.forEach((file) => {
      // Verifica tipo file (solo immagini)
      if (!file.type.startsWith('image/')) {
        setError(`Il file ${file.name} deve essere un'immagine`)
        return
      }

      // Verifica dimensione (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(`Il file ${file.name} è troppo grande (massimo 5MB)`)
        return
      }

      validFiles.push(file)
      
      // Crea preview
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          previews.push(e.target.result as string)
          setPreviewUrls([...previewUrls, ...previews])
        }
      }
      reader.readAsDataURL(file)
    })

    setAttachments([...attachments, ...validFiles])
    setError('')
  }

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index)
    const newPreviews = previewUrls.filter((_, i) => i !== index)
    setAttachments(newAttachments)
    setPreviewUrls(newPreviews)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!message.trim()) {
      setError('Inserisci un messaggio')
      return
    }

    if (isFirstMessage && !subject) {
      setError('Seleziona un motivo per contattare')
      return
    }

    if (!user) {
      setError('Devi essere loggato per inviare messaggi')
      return
    }

    setSending(true)

    try {
      const formData = new FormData()
      formData.append('userId', user.id)
      formData.append('isAdmin', isAdmin() ? 'true' : 'false')
      
      if (isAdmin()) {
        formData.append('adminId', user.id)
      }

      // Usa subject del primo messaggio se presente, altrimenti quello selezionato o "ALTRO"
      const messageSubject = isFirstMessage && subject 
        ? subject 
        : (hasMessages && messages[0]?.subject ? messages[0].subject : 'ALTRO')
      formData.append('subject', messageSubject)
      formData.append('message', message.trim())

      // Aggiungi allegati
      attachments.forEach((file) => {
        formData.append('attachments', file)
      })

      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'invio messaggio')
      }

      const data = await response.json()
      
      // Aggiorna lista messaggi
      setMessages([...messages, data.message])
      
      // Reset form
      setMessage('')
      setAttachments([])
      setPreviewUrls([])
      setIsFirstMessage(false)
      setSubject('')
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Se era il primo messaggio, chiudi il form e ricarica i messaggi
      if (isFirstMessage) {
        setShowForm(false)
        loadMessages()
      } else {
        // Scroll automatico dopo l'invio del messaggio
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      }
    } catch (error: any) {
      setError(error.message || 'Errore nell\'invio messaggio')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Caricamento messaggi...</p>
      </div>
    )
  }

  const hasMessages = messages.length > 0

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
      {/* Header Chat */}
      <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center text-gray-900">
              <FiMessageCircle className="mr-2 text-primary-600" />
              Messaggi Ordine
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Conversazione con il supporto
            </p>
          </div>
          {!showForm && hasMessages && (
            <button
              onClick={() => {
                setShowForm(true)
                // Scroll verso il basso dopo che il form viene mostrato
                setTimeout(() => {
                  scrollToBottom()
                }, 100)
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm shadow-sm"
            >
              <FiSend className="w-4 h-4" />
              <span>Rispondi</span>
            </button>
          )}
        </div>

        {/* Informazione per contatto supporto */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Hai bisogno di aiuto?</strong> Se hai domande sul tuo ordine o hai bisogno di assistenza, utilizza questa sezione per contattarci.
          </p>
        </div>
      </div>

      {/* Container Chat */}
      <div className="flex-1 flex flex-col px-6 pb-6">
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Lista Messaggi - Chat Style */}
        {hasMessages ? (
          <div className="flex-1 overflow-y-auto py-4 bg-gray-50 rounded-lg px-4 mt-4 scroll-smooth min-h-[300px] max-h-[500px]">
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const isFromAdmin = !!msg.adminId
                const isCurrentUser = isFromAdmin ? (isAdmin() && msg.adminId === user?.id) : (msg.userId === user?.id)
                
                // Calcola se mostrare separatore di data
                const msgDate = new Date(msg.createdAt)
                const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt) : null
                const showDateSeparator = !prevMsgDate || 
                  msgDate.toDateString() !== prevMsgDate.toDateString()

                return (
                  <div key={msg.id}>
                    {/* Separatore di data */}
                    {showDateSeparator && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-500 shadow-sm">
                          {msgDate.toLocaleDateString('it-IT', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    {/* Messaggio inviato (utente corrente) */}
                    {isCurrentUser ? (
                      <div className="flex justify-end mb-2">
                        <div className="max-w-[75%] lg:max-w-[60%]">
                          {/* Mostra il subject solo nel primo messaggio */}
                          {index === 0 && msg.subject && (
                            <div className="mb-2 text-right">
                              <span className="inline-block px-3 py-1 bg-primary-800 text-white text-xs rounded-full">
                                {SUBJECT_OPTIONS.find((opt) => opt.value === msg.subject)?.label || msg.subject}
                              </span>
                            </div>
                          )}
                          <div className="bg-primary-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {msg.message}
                            </p>
                            
                            {/* Allegati */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {msg.attachments.map((att) => (
                                  <div key={att.id} className="relative rounded-lg overflow-hidden">
                                    <Image
                                      src={att.fileUrl}
                                      alt={att.fileName}
                                      width={300}
                                      height={200}
                                      className="rounded-lg object-cover border-2 border-primary-400"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end items-center space-x-2 mt-1 px-1">
                            <span className="text-xs text-gray-500">
                              {msgDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isFromAdmin && (
                              <FiShield className="w-3 h-3 text-primary-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Messaggio ricevuto (altro utente/admin) */
                      <div className="flex justify-start mb-2">
                        <div className="max-w-[75%] lg:max-w-[60%]">
                          {/* Mostra il subject solo nel primo messaggio */}
                          {index === 0 && msg.subject && (
                            <div className="mb-2 text-left">
                              <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                {SUBJECT_OPTIONS.find((opt) => opt.value === msg.subject)?.label || msg.subject}
                              </span>
                            </div>
                          )}
                          {/* Avatar e nome (solo per admin o se è un nuovo messaggio da utente diverso) */}
                          {(isFromAdmin || (index === 0 || messages[index - 1].userId !== msg.userId || messages[index - 1].adminId !== msg.adminId)) && (
                            <div className="flex items-center space-x-2 mb-1 px-1">
                              {isFromAdmin ? (
                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                  <FiShield className="w-3 h-3 text-purple-600" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                  <FiUser className="w-3 h-3 text-gray-600" />
                                </div>
                              )}
                              <span className="text-xs font-medium text-gray-600">
                                {isFromAdmin
                                  ? msg.admin?.name || 'Amministratore'
                                  : msg.user?.name || 'Utente'}
                              </span>
                            </div>
                          )}
                          <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm ${
                            isFromAdmin
                              ? 'bg-purple-100 text-gray-900 border border-purple-200'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}>
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {msg.message}
                            </p>
                            
                            {/* Allegati */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {msg.attachments.map((att) => (
                                  <div key={att.id} className="relative rounded-lg overflow-hidden">
                                    <Image
                                      src={att.fileUrl}
                                      alt={att.fileName}
                                      width={300}
                                      height={200}
                                      className="rounded-lg object-cover border-2 border-gray-300"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1 px-1">
                            {isFromAdmin && (
                              <FiShield className="w-3 h-3 text-purple-600" />
                            )}
                            <span className="text-xs text-gray-500">
                              {msgDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div ref={messagesEndRef} />
          </div>
        ) : !showForm ? (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-500">
            <div className="text-center">
              <FiMessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-gray-600 mb-2">Nessun messaggio ancora</p>
              <p className="text-sm text-gray-500 mb-4">
                Inizia una conversazione per qualsiasi domanda sul tuo ordine
              </p>
              {!isAdmin() && (
                <button
                  onClick={() => {
                    setShowForm(true)
                    setIsFirstMessage(true)
                  }}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium shadow-sm"
                >
                  <FiSend className="w-4 h-4" />
                  <span>Invia il Primo Messaggio</span>
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Form Messaggio - Chat Style (fisso in basso) */}
        {showForm && (
          <div className="mt-4 pt-4 border-t bg-white rounded-lg p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Motivo del contatto (solo per il primo messaggio) */}
              {(isFirstMessage || (!hasMessages && !isAdmin())) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo del Contatto *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required={isFirstMessage}
                  >
                    <option value="">Seleziona un motivo...</option>
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview Allegati */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={url}
                        alt={`Preview ${index + 1}`}
                        width={150}
                        height={150}
                        className="rounded-lg object-cover border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition shadow-lg"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Area di input messaggio (stile chat) */}
              <div className="bg-white border-2 border-gray-300 rounded-2xl p-3 focus-within:border-primary-500 transition">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-2 border-0 resize-none focus:outline-none focus:ring-0 text-sm"
                  placeholder="Scrivi un messaggio..."
                  required
                />
                
                {/* Barra strumenti in basso */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label
                      htmlFor="file-input"
                      className="flex items-center space-x-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer text-sm"
                    >
                      <FiImage className="w-5 h-5" />
                      <span className="hidden sm:inline">Foto</span>
                    </label>
                    {attachments.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {attachments.length} {attachments.length === 1 ? 'file' : 'file'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setMessage('')
                        setAttachments([])
                        setPreviewUrls([])
                        setError('')
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <FiSend className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {sending ? 'Invio...' : 'Invia'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

