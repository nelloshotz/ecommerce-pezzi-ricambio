'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Product, Order, User } from '@/types'
import Link from 'next/link'
import { FiPackage, FiShoppingBag, FiUsers, FiTrendingUp, FiArrowRight, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function AdminDashboard() {
  const { user: currentUser } = useAuthStore()
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0, // Fatturato mese corrente
    lowStockCount: 0, // Numero prodotti con stock sotto soglia
  })
  const [loading, setLoading] = useState(true)
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [dailyRevenue, setDailyRevenue] = useState<Array<{ date: string; revenue: number; day: number }>>([])
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [monthlyTotal, setMonthlyTotal] = useState(0)

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        const [productsResponse, ordersResponse, usersResponse] = await Promise.all([
          fetch('/api/products?includeInactive=true', {
            headers: {
              'x-include-inactive': 'true',
              'x-user-id': currentUser?.id || '',
            },
            cache: 'no-store',
          }),
          fetch('/api/admin/orders', {
            headers: {
              'x-user-id': currentUser?.id || '',
            },
            cache: 'no-store',
          }),
          fetch('/api/admin/users', {
            headers: {
              'x-user-id': currentUser?.id || '',
            },
            cache: 'no-store',
          }),
        ])

        if (!productsResponse.ok || !ordersResponse.ok || !usersResponse.ok) {
          throw new Error('Errore nel caricamento statistiche')
        }

        const [productsData, ordersData, usersData] = await Promise.all([
          productsResponse.json(),
          ordersResponse.json(),
          usersResponse.json(),
        ])

        const products = productsData.products || []
        // L'API admin/orders ritorna direttamente array, non un oggetto
        const orders = Array.isArray(ordersData) ? ordersData : ordersData.orders || []
        const users = usersData.users || []

        const activeProducts = products.filter((p: Product) => p.active).length
        const pendingOrders = orders.filter(
          (o: Order) => o.status === 'PENDING'
        ).length
        const totalRevenue = orders
          .filter((o: Order) => o.paymentStatus === 'PAID')
          .reduce((sum: number, o: Order) => sum + o.total, 0)

        // Calcola fatturato mese corrente
        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        const monthlyRevenue = orders
          .filter((o: Order) => {
            const orderDate = new Date(o.createdAt)
            return (
              o.paymentStatus === 'PAID' &&
              orderDate >= currentMonthStart &&
              orderDate <= currentMonthEnd
            )
          })
          .reduce((sum: number, o: Order) => sum + o.total, 0)

        // Carica prodotti con stock basso
        let lowStockCount = 0
        try {
          const alertsResponse = await fetch('/api/admin/inventory/alerts', {
            headers: {
              'x-user-id': currentUser?.id || '',
            },
            cache: 'no-store',
          })
          if (alertsResponse.ok) {
            const alertsData = await alertsResponse.json()
            lowStockCount = (alertsData.lowStockProducts?.length || 0) + 
                          (alertsData.criticalStockProducts?.length || 0)
          }
        } catch (error) {
          console.error('Errore nel caricamento alert stock:', error)
        }

        setStats({
          totalProducts: products.length,
          activeProducts,
          totalOrders: orders.length,
          pendingOrders,
          totalUsers: users.length,
          totalRevenue,
          monthlyRevenue,
          lowStockCount,
        })
      } catch (error) {
        console.error('Errore nel caricamento statistiche:', error)
      } finally {
        setLoading(false)
      }
    }

    if (currentUser?.id) {
      loadStats()
    }
  }, [currentUser?.id])

  // Carica fatturato giornaliero
  useEffect(() => {
    async function loadDailyRevenue() {
      if (!currentUser?.id) return

      try {
        setRevenueLoading(true)
        const response = await fetch(
          `/api/admin/revenue/daily?year=${currentYear}&month=${currentMonth}`,
          {
            headers: {
              'x-user-id': currentUser.id,
            },
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          throw new Error('Errore nel caricamento fatturato giornaliero')
        }

        const data = await response.json()
        setDailyRevenue(data.dailyRevenue || [])
        setMonthlyTotal(data.monthlyTotal || 0)
      } catch (error) {
        console.error('Errore nel caricamento fatturato giornaliero:', error)
      } finally {
        setRevenueLoading(false)
      }
    }

    if (currentUser?.id) {
      loadDailyRevenue()
    }
  }, [currentUser?.id, currentMonth, currentYear])

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    const now = new Date()
    const currentMonthNow = now.getMonth() + 1
    const currentYearNow = now.getFullYear()

    // Non permettere di andare oltre il mese corrente
    if (currentYear > currentYearNow || (currentYear === currentYearNow && currentMonth >= currentMonthNow)) {
      return
    }

    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const canGoNext = () => {
    const now = new Date()
    const currentMonthNow = now.getMonth() + 1
    const currentYearNow = now.getFullYear()
    return !(currentYear > currentYearNow || (currentYear === currentYearNow && currentMonth >= currentMonthNow))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento statistiche...</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Prodotti Totali',
      value: stats.totalProducts,
      subtitle: `${stats.activeProducts} attivi`,
      icon: FiPackage,
      color: 'bg-blue-500',
      href: '/admin/prodotti',
    },
    // Riquadro dinamico per prodotti con stock basso
    ...(stats.lowStockCount > 0 ? [{
      title: 'Stock Basso',
      value: stats.lowStockCount,
      subtitle: 'Richiedono attenzione',
      icon: FiAlertTriangle,
      color: 'bg-red-500',
      href: '/admin/prodotti/stock-basso',
    }] : []),
    {
      title: 'Ordini Totali',
      value: stats.totalOrders,
      subtitle: `${stats.pendingOrders} in attesa`,
      icon: FiShoppingBag,
      color: 'bg-green-500',
      href: '/admin/ordini',
    },
    {
      title: 'Utenti',
      value: stats.totalUsers,
      subtitle: 'Registrati',
      icon: FiUsers,
      color: 'bg-purple-500',
      href: '/admin/utenti',
    },
    {
      title: 'Fatturato Totale',
      value: `€${stats.monthlyRevenue.toFixed(2)}`,
      subtitle: `Mese corrente (${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })})`,
      icon: FiTrendingUp,
      color: 'bg-yellow-500',
      href: '/admin/ordini',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Amministratore</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.title}
              href={stat.href}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <FiArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">
                {stat.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className="text-gray-500 text-sm">{stat.subtitle}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Azioni Rapide</h2>
          <div className="space-y-3">
            <Link
              href="/admin/prodotti?new=true"
              className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition"
            >
              ➕ Aggiungi Nuovo Prodotto
            </Link>
            <Link
              href="/admin/ordini?status=pending"
              className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition"
            >
              📦 Visualizza Ordini in Attesa
            </Link>
            <Link
              href="/admin/utenti"
              className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition"
            >
              👥 Gestisci Utenti
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Fatturato Giornaliero</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Mese precedente"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium min-w-[150px] text-center">
                {new Date(currentYear, currentMonth - 1).toLocaleDateString('it-IT', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={!canGoNext()}
                className={`p-2 rounded-lg transition ${
                  canGoNext() ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'
                }`}
                title={canGoNext() ? 'Mese successivo' : 'Mese corrente'}
              >
                <FiArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {revenueLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Caricamento dati...</p>
            </div>
          ) : dailyRevenue.length > 0 ? (
            <div>
              <div className="mb-4 p-3 bg-primary-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Fatturato totale del mese: <span className="font-bold text-primary-700">€{monthlyTotal.toFixed(2)}</span>
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    label={{ value: 'Giorno', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    label={{ value: 'Fatturato (€)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: any) => `€${Number(value).toFixed(2)}`}
                    labelFormatter={(label) => `Giorno ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Nessun dato disponibile per questo mese</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

