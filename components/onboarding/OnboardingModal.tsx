'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Linkedin, Twitter, Instagram, Loader2 } from 'lucide-react'

interface Props {
  onComplete: () => void
}

function normalizeLinkedinUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  // Already a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  // Contains linkedin.com but no scheme
  if (trimmed.includes('linkedin.com/')) return 'https://' + trimmed
  // Strip leading @ or /in/ prefix, treat remainder as handle
  const handle = trimmed.replace(/^@/, '').replace(/^\/in\//, '').replace(/\/$/, '')
  return `https://www.linkedin.com/in/${handle}`
}

export default function OnboardingModal({ onComplete }: Props) {
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [xHandle, setXHandle] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [loading, setLoading] = useState(false)

  const hasAnyValue = linkedinUrl.trim() !== '' || xHandle.trim() !== '' || instagramHandle.trim() !== ''

  async function handleSubmit() {
    setLoading(true)
    try {
      const normalizedUrl = normalizeLinkedinUrl(linkedinUrl)
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedin_url: normalizedUrl || undefined,
          x_handle: xHandle.trim() || undefined,
          instagram_handle: instagramHandle.trim() || undefined,
          onboarding_completed: true,
        }),
      })

      if (normalizedUrl.includes('linkedin.com/in/')) {
        // Fire and forget — don't await
        fetch('/api/voice/scrape?linkedinUrl=' + encodeURIComponent(normalizedUrl))
      }
    } finally {
      onComplete()
    }
  }

  async function handleSkip() {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_completed: true }),
    })
    onComplete()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4"
    >
      {/* Atmospheric glow — same orange radials as login page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-orange-400/8 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-10 shadow-2xl"
      >
        {/* Logo row */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-heading text-base text-foreground">Amplify</span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-4xl font-light text-foreground mb-3">
          Make your voice heard
        </h1>

        {/* Subtext */}
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Connect your social profiles and we&apos;ll learn your writing style to generate posts that sound authentically like you.
        </p>

        {/* Input rows */}
        <div className="space-y-4 mb-6">
          {/* LinkedIn */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Linkedin className="h-3.5 w-3.5 text-blue-400" /> LinkedIn
            </label>
            <input
              type="text"
              placeholder="linkedin.com/in/your-name or just your-handle"
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* X (Twitter) */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Twitter className="h-3.5 w-3.5" /> X (Twitter)
              <span className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded-full text-muted-foreground">Coming soon</span>
            </label>
            <input
              type="text"
              placeholder="@yourhandle"
              value={xHandle}
              onChange={e => setXHandle(e.target.value)}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring opacity-60"
            />
          </div>

          {/* Instagram */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Instagram className="h-3.5 w-3.5" /> Instagram
              <span className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded-full text-muted-foreground">Coming soon</span>
            </label>
            <input
              type="text"
              placeholder="@yourhandle"
              value={instagramHandle}
              onChange={e => setInstagramHandle(e.target.value)}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring opacity-60"
            />
          </div>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground/70 mb-8">
          At least one profile helps us personalise your posts. We never post on your behalf.
        </p>

        {/* Action row */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !hasAnyValue}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Let&apos;s go
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
