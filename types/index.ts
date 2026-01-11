export interface Product {
  id: string
  name: string
  description: string
  price: number
  vatRate?: number // Aliquota IVA in percentuale (es. 22 per 22%)
  image: string
  category: string
  categoryId?: string // ID della categoria (per form admin)
  productType?: string // ID del tipo prodotto (es. 'olio-motore', 'batteria')
  customFields?: Record<string, any> // Campi dinamici in base al tipo prodotto
  brand?: string
  partNumber?: string // Codice del produttore (es. OF123)
  sku?: string // Codice prodotto univoco (SKU - Stock Keeping Unit)
  inStock: boolean
  stockQuantity: number // Quantità disponibile (obbligatoria, default 0)
  reservedQuantity?: number // Quantità riservata nel carrello (non ancora venduta)
  active: boolean // Prodotto attivo/disattivo per lo store
  featured?: boolean // Prodotto in evidenza per la homepage
  // Dimensioni e peso per calcolo spedizione
  height?: number // Altezza in cm
  width?: number // Larghezza in cm
  depth?: number // Profondità in cm
  weight?: number // Peso in kg
  technicalSheet?: string | null // Scheda tecnica (URL o path)
  compatibility?: string | null // Compatibilità (es. marchi auto/moto)
  lowStockThreshold?: number | null // Soglia minima stock per alert
  createdAt?: Date
  updatedAt?: Date
}

export interface CartItem {
  id?: string
  productId?: string
  product: Product
  quantity: number
  price?: number // Prezzo effettivo pagato (con IVA e sconto se presente) al momento dell'aggiunta
  reservationExpiresAt?: Date | string | null // Data scadenza prenotazione (per prodotti con 1 solo pezzo)
}

export interface Cart {
  items: CartItem[]
  total: number
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  total: number
  productName?: string // Nome prodotto al momento dell'ordine (storico)
  productSku?: string | null // SKU prodotto al momento dell'ordine (storico)
  product?: Product | null // Prodotto corrente (può essere null se eliminato)
}

export interface Order {
  id: string
  orderNumber?: string
  userId: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  shippingCarrier?: string | null // Nome corriere: "GLS", "BRT", "Poste Italiane"
  shippingBaseCost?: number | null // Costo base spedizione (senza ricarico)
  shippingMarkupPercent?: number | null // Percentuale ricarico applicata
  shippingPackages?: string | null // JSON con info sui colli
  tax?: number
  total: number
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'DELAYED' | 'CANCELLED' | 'REFUNDED'
  shippingAddress: Address
  billingAddress: Address
  paymentMethod: string
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  notes?: string | null
  trackingNumber?: string | null
  shippedAt?: Date | string | null
  deliveredAt?: Date | string | null
  confirmedAt?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  user?: {
    id: string
    name: string
    email: string
  }
  unreadMessagesCount?: number // Conteggio messaggi non letti dall'admin
}

export interface Address {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  country: string
  province?: string
}

export interface User {
  id: string
  email: string
  name: string
  phone?: string | null
  role: 'customer' | 'admin' | 'CUSTOMER' | 'ADMIN'
  userType?: 'PRIVATE' | 'COMPANY'
  companyName?: string | null
  companyAddress?: string | null
  companyTaxCode?: string | null
  companyPec?: string | null
  createdAt: Date
  updatedAt: Date
  addresses?: Address[]
}

export interface AdminUser extends User {
  passwordHash: string
}

// Interface per gestire le vendite e aggiornare le quantità
export interface Sale {
  id: string
  orderId: string
  productId: string
  quantity: number
  price: number
  date: Date
}

