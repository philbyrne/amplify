'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Zap, CheckCircle, Loader2 } from 'lucide-react'

export default function ExtensionAuthPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'generating' | 'done' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login?callbackUrl=/extension-auth')
      return
    }

    // Session exists — generate a token and redirect with it in the URL
    // The extension's background script is watching for this URL pattern
    setState('generating')
    fetch('/api/extension/token', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.token) throw new Error(data.error || 'No token returned')
        // Redirect to self with the token — background.js picks it up
        window.location.href = `/extension-auth?token=${encodeURIComponent(data.token)}`
      })
      .catch((err) => {
        setError(err.message || 'Something went wrong')
        setState('error')
      })
  }, [session, status]) // eslint-disable-line react-hooks/exhaustive-deps

  // If the URL already has a token (second load after redirect), show success briefly
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('token')) {
      setState('done')
      // Tab will be closed by the extension — show a nice message in case it isn't
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
          <Zap className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h1 className="font-heading text-2xl font-light text-foreground mb-2">Amplify Extension</h1>

          {state === 'loading' || state === 'generating' ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {state === 'loading' ? 'Checking your session…' : 'Connecting to extension…'}
            </div>
          ) : state === 'done' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <CheckCircle className="h-4 w-4" />
                Connected! This tab will close automatically.
              </div>
              <p className="text-xs text-muted-foreground">
                If it doesn&apos;t close, you can close it manually — you&apos;re all set.
              </p>
            </div>
          ) : (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error || 'Something went wrong. Please try again.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
