'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log dell'errore
    this.logError(error, errorInfo)
  }

  async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: this.props.componentName || 'ErrorBoundary',
          url: typeof window !== 'undefined' ? window.location.pathname : 'Unknown',
          user: null, // Sarà popolato dal componente se necessario
          error: error.message,
          stack: error.stack,
          message: 'Errore catturato da ErrorBoundary',
          timestamp: new Date().toISOString(),
          additionalInfo: {
            componentStack: errorInfo.componentStack,
            errorInfo: errorInfo.toString(),
          },
        }),
      }).catch(() => {
        // Ignora errori di logging
        console.error('Errore nel logging:', error, errorInfo)
      })
    } catch (logErr) {
      console.error('Errore nel logging:', logErr)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-4">Errore nel caricamento</h1>
            <p className="text-red-800 mb-4">
              Si è verificato un errore durante il caricamento della pagina. L'errore è stato registrato nel file di log.
            </p>
            {this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-red-700 font-medium">Dettagli tecnici</summary>
                <pre className="mt-2 p-4 bg-red-100 rounded text-sm text-red-900 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack && (
                    <>
                      {'\n\nStack trace:\n'}
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Ricarica Pagina
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

