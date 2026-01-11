import { NextRequest, NextResponse } from 'next/server'
import { writeFile, appendFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const LOG_DIR = join(process.cwd(), 'logs')
const ERROR_LOG_FILE = join(LOG_DIR, 'admin-profilo-errors.log')

// Crea la directory logs se non esiste
async function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true })
  }
}

// POST - Scrive un errore nel file di log
export async function POST(request: NextRequest) {
  try {
    await ensureLogDir()

    const body = await request.json()
    const { error, message, stack, component, url, user, timestamp } = body

    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      component: component || 'Unknown',
      url: url || 'Unknown',
      user: user || null,
      error: error || message || 'Unknown error',
      stack: stack || null,
      ...(body.additionalInfo ? { additionalInfo: body.additionalInfo } : {}),
    }

    const logLine = JSON.stringify(logEntry) + '\n'

    await appendFile(ERROR_LOG_FILE, logLine, 'utf-8')

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel logging:', error)
    return NextResponse.json(
      { error: 'Errore nel logging', details: error.message },
      { status: 500 }
    )
  }
}

// GET - Recupera gli ultimi log (opzionale, per debug)
export async function GET(request: NextRequest) {
  try {
    if (!existsSync(ERROR_LOG_FILE)) {
      return NextResponse.json({ logs: [], message: 'Nessun log disponibile' }, { status: 200 })
    }

    const fs = await import('fs')
    const content = fs.readFileSync(ERROR_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)
    const logs = lines
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .slice(-100) // Ultimi 100 log

    return NextResponse.json({ logs, total: logs.length }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel recupero log:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero log', details: error.message },
      { status: 500 }
    )
  }
}

