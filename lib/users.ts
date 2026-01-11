import { User } from '@/types'

// Mock users - in produzione verranno da un database
export const mockUsersList: User[] = [
  {
    id: '1',
    email: 'admin@motorplanet.it',
    name: 'Admin MotorPlanet',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'user@example.com',
    name: 'Utente Test',
    role: 'customer',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    email: 'mario.rossi@example.com',
    name: 'Mario Rossi',
    role: 'customer',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
]

// Funzioni per interagire con le API route degli utenti admin
// I dati mock sono stati sostituiti con chiamate alle API route

export async function getAllUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/admin/users', {
      cache: 'no-store',
      headers: {
        // L'autenticazione verrà gestita dal middleware o dall'header x-user-id
        // Questo è per chiamate lato server, per chiamate lato client serve passare l'header
      },
    })

    if (!response.ok) {
      throw new Error('Errore nel recupero utenti')
    }

    const data = await response.json()
    return data.users || []
  } catch (error) {
    console.error('Errore nel recupero utenti:', error)
    return []
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/admin/users/${id}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Errore nel recupero utente')
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Errore nel recupero utente:', error)
    return null
  }
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'customer' | 'ADMIN' | 'CUSTOMER'
): Promise<User | null> {
  try {
    const roleValue = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CUSTOMER'
    
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: roleValue }),
    })

    if (!response.ok) {
      throw new Error('Errore nell\'aggiornamento ruolo utente')
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Errore nell\'aggiornamento ruolo utente:', error)
    return null
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Errore nell\'eliminazione utente')
    }

    return true
  } catch (error) {
    console.error('Errore nell\'eliminazione utente:', error)
    return false
  }
}

// Nuova funzione per creare utente (admin)
export async function createUser(userData: {
  email: string
  password: string
  name: string
  phone?: string
  role?: 'ADMIN' | 'CUSTOMER'
}): Promise<User | null> {
  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      throw new Error('Errore nella creazione utente')
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Errore nella creazione utente:', error)
    return null
  }
}

// Funzione per aggiornare utente (admin)
export async function updateUser(
  userId: string,
  updates: {
    email?: string
    name?: string
    phone?: string
    role?: 'ADMIN' | 'CUSTOMER'
    password?: string
  }
): Promise<User | null> {
  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error('Errore nell\'aggiornamento utente')
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Errore nell\'aggiornamento utente:', error)
    return null
  }
}

