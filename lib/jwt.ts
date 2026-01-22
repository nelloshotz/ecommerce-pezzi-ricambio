import jwt from 'jsonwebtoken'
import { User } from '@prisma/client'

// Chiave segreta per firmare i token (usa variabile d'ambiente in produzione)
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h' // Token valido per 24 ore

// Verifica che JWT_SECRET sia una stringa valida (solo in runtime, non durante il build)
if (typeof window === 'undefined' && (!JWT_SECRET || JWT_SECRET.trim() === '')) {
  console.warn('⚠️ JWT_SECRET non è configurato. Usa una chiave sicura in produzione.')
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Genera un JWT token per un utente
 */
export function generateToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

/**
 * Verifica e decodifica un JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload
    return decoded
  } catch (error) {
    // Token invalido, scaduto o manomesso
    return null
  }
}

/**
 * Estrae il token dall'header Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  // Formato: "Bearer <token>"
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

