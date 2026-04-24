'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Linkedin, RefreshCw, CheckCircle, AlertCircle, Info, Unlink } from 'lucide-react'
import type { User, VoiceProfile } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  profile: User | null
  onUpdate: (updated: User) => void
}

export default function VoiceSetup({ profile, onUpdate }: Props) {
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || '')
  const [scanning, setScanning] = useState(false)
  const [unsyncing, setUnsyncing] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  function normalizeLinkedinUrl(input: string): string {
    const trimmed = input.trim()
    if (!trimmed) return trimmed
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    if (trimmed.includes('linkedin.com/')) return 'https://' + trimmed
    const handle = trimmed.replace(/^@/, '').replace(/^\/in\//, '').replace(/\/$/, '')
    return `https://www.linkedin.com/in/${handle}`
  }

  async function handleScan() {
    const raw = linkedinUrl.trim()
    if (!raw) return

    const url = normalizeLinkedinUrl(raw)
    setScanning(true)
    setResult(null)

    try {
      // Save the URL first
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedin_url: url }),
      })

      // Scrape posts
      const res = await fetch(
        `/api/voice/scrape?linkedinUrl=${encodeURIComponent(url)}`
      )
      const data = await res.json()

      if (!res.ok) {
        setResult({ type: 'error', message: data.error || 'Failed to scan profile' })
        return
      }

      setResult({
        type: data.usedFallback ? 'info' : 'success',
        message: data.message,
      })

      // Refresh profile
      const profileRes = await fetch('/api/profile')
      const updatedProfile = await profileRes.json()
      onUpdate(updatedProfile)
    } catch {
      setResult({
        type: 'error',
        message: 'Something went wrong. Please try again.',
      })
    } finally {
      setScanning(false)
    }
  }

  async function handleUnsync() {
    setUnsyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedin_url: null, voice_profile: null }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setLinkedinUrl('')
      onUpdate(updated)
      setResult({ type: 'info', message: 'LinkedIn disconnected. Your voice profile has been removed.' })
    } catch {
      setResult({ type: 'error', message: 'Failed to disconnect. Please try again.' })
    } finally {
      setUnsyncing(false)
    }
  }

  const voiceProfile: VoiceProfile | null = profile?.voice_profile || null

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="bg-primary/10 rounded-xl p-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Voice Personalisation</h3>
          <p className="text-xs text-muted-foreground">
            Connect your LinkedIn to generate copy that sounds like you
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Status */}
        {voiceProfile ? (
          <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-400">
                Voice profile active
              </p>
              <p className="text-xs text-green-500/80 mt-0.5">
                {voiceProfile.posts.length} posts loaded ·{' '}
                {voiceProfile.tone_notes}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last synced{' '}
                {formatDistanceToNow(new Date(voiceProfile.last_synced), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <button
              onClick={handleUnsync}
              disabled={unsyncing}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
              title="Disconnect LinkedIn"
            >
              <Unlink className="h-3.5 w-3.5" />
              {unsyncing ? 'Removing...' : 'Remove'}
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">
                No voice profile yet
              </p>
              <p className="text-xs text-blue-400/70 mt-0.5">
                Add your LinkedIn URL below and scan your profile to personalise
                AI-generated copy to sound like you.
              </p>
            </div>
          </div>
        )}

        {/* LinkedIn URL input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            LinkedIn Profile URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="linkedin.com/in/your-name or just your-handle"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-border bg-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={!linkedinUrl.trim() || scanning}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`}
              />
              {scanning
                ? 'Scanning...'
                : voiceProfile
                  ? 'Re-sync'
                  : 'Scan Profile'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            We scan your public LinkedIn posts to learn your writing style. Your
            data stays private and is only used to personalise copy generation.
          </p>
        </div>

        {/* Result notification */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
                result.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : result.type === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {result.type === 'success' ? (
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
              ) : result.type === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              ) : (
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              )}
              {result.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice appraisal */}
        {voiceProfile?.tone_notes && !voiceProfile.tone_notes.startsWith('Using sample') && !voiceProfile.tone_notes.startsWith('Loaded') && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-primary font-mono-caps uppercase tracking-wide mb-2">
              Your voice, according to Claude
            </p>
            <p className="text-sm text-foreground leading-relaxed">{voiceProfile.tone_notes}</p>
          </div>
        )}

        {/* Audience context */}
        {voiceProfile?.audience_context && (
          <div className="bg-secondary border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide mb-2">
              Your likely audience
            </p>
            <p className="text-sm text-foreground leading-relaxed">{voiceProfile.audience_context}</p>
          </div>
        )}

        {/* Show loaded posts */}
        {voiceProfile && voiceProfile.posts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide mb-3">
              {voiceProfile.posts.length} voice samples loaded
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {voiceProfile.posts.map((post, i) => (
                <div
                  key={i}
                  className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground leading-relaxed border border-border"
                >
                  &ldquo;{post.slice(0, 200)}{post.length > 200 ? '...' : ''}&rdquo;
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
