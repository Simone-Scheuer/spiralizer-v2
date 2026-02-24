'use client'

import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uzumaki error boundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md px-6">
            <div className="text-6xl">&#x1F300;</div>
            <h1 className="text-white text-xl font-mono">Something went wrong</h1>
            <p className="text-white/50 text-sm font-mono">
              Uzumaki encountered an unexpected error. Try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-mono hover:bg-white/20 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
