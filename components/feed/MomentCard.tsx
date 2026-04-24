'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Linkedin, Twitter, Users } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { SharingMoment, Package } from '@/lib/types'

const ShareModal = dynamic(() => import('./ShareModal'), { ssr: false })

interface Props {
  moment: SharingMoment
  index: number
  onDismiss: (id: string) => void
  onShared?: (id: string) => void
  autoOpen?: boolean
}

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ days, hours, minutes, seconds })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return timeLeft
}

function momentToPackage(moment: SharingMoment): Package {
  const pc = moment.parsed_content
  const body = pc
    ? [
        pc.background,
        pc.key_messages?.length ? `Key messages:\n${pc.key_messages.map((m) => `• ${m}`).join('\n')}` : '',
        pc.talking_points?.length ? `Talking points:\n${pc.talking_points.map((t) => `• ${t}`).join('\n')}` : '',
        pc.call_to_action ? `CTA: ${pc.call_to_action}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    : ''

  return {
    id: moment.id,
    title: moment.title,
    description: moment.summary,
    body,
    platform_targets: moment.platform_targets,
    drive_folder_url: null,
    has_no_files: true,
    example_copies: [],
    tags: [],
    cover_image_url: null,
    is_active: true,
    created_by: moment.created_by,
    created_at: moment.created_at,
    updated_at: moment.created_at,
  }
}

export default function MomentCard({ moment, index, onDismiss, onShared, autoOpen }: Props) {
  const [shareOpen, setShareOpen] = useState(false)

  // Auto-open the share modal when linked from the Chrome extension
  useEffect(() => {
    if (autoOpen) setShareOpen(true)
  }, [autoOpen])
  const [dismissing, setDismissing] = useState(false)
  const { days, hours, minutes, seconds } = useCountdown(moment.expires_at)
  const urgent = days < 2

  async function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm('Remove this moment from your feed? You can still find it under "Expired / Dismissed".')) return
    setDismissing(true)
    await fetch(`/api/moments/${moment.id}/dismiss`, { method: 'POST' })
    // Tell the Chrome extension to refresh immediately
    window.postMessage({ type: 'AMPLIFY_SHARED' }, '*')
    onDismiss(moment.id)
  }

  const pkg = momentToPackage(moment)
  const priority: 1 | 2 | 3 = (moment.parsed_content?.priority ?? 1) as 1 | 2 | 3

  // Derive up to 3 short pills from the moment's key messages (already AI-parsed)
  const momentDifferentiators = (moment.parsed_content?.key_messages || [])
    .slice(0, 2)
    .map((msg) => (msg.length > 32 ? msg.slice(0, 30) + '…' : msg))

  async function handleShared() {
    // Auto-dismiss so the moment won't reappear in the active feed on refresh
    await fetch(`/api/moments/${moment.id}/dismiss`, { method: 'POST' })
    onShared?.(moment.id)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, delay: index * 0.05 }}
        className="relative bg-card border border-primary/30 rounded-2xl overflow-hidden cursor-pointer group hover:border-primary/60 transition-colors"
        onClick={() => setShareOpen(true)}
      >
        {/* Orange accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-transparent" />

        <div className="p-5">
          {/* Title row — bolts + title left, countdown right, dismiss top-right */}
          <div className="flex items-start gap-3 mb-2">
            {/* Bolts + title */}
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {/* Fixed container absorbs 1–3 bolts without shifting the title */}
              <div className="relative shrink-0 mt-1.5" style={{ width: 22, height: 14 }}>
                {Array.from({ length: priority }).map((_, i) => (
                  <Zap
                    key={i}
                    className="absolute h-3.5 w-3.5 text-primary fill-primary/20"
                    style={{ left: i * 5 }}
                  />
                ))}
              </div>
              <h3 className="font-heading text-xl font-light text-foreground leading-snug line-clamp-2">{moment.title}</h3>
            </div>

            {/* Countdown — elevated to title row, right side */}
            <div className={`flex flex-col items-end shrink-0 ${urgent ? 'text-red-400' : 'text-foreground/70'}`}>
              <div className="flex items-center gap-0.5 text-sm font-mono font-semibold tabular-nums leading-none">
                {days > 0 && <><span>{String(days).padStart(2, '0')}d</span><span className="opacity-30 mx-0.5">:</span></>}
                <span>{String(hours).padStart(2, '0')}h</span>
                <span className="opacity-30 mx-0.5">:</span>
                <span>{String(minutes).padStart(2, '0')}m</span>
                <span className="opacity-30 mx-0.5">:</span>
                <span>{String(seconds).padStart(2, '0')}s</span>
              </div>
              <span className="text-[9px] font-mono-caps tracking-widest opacity-50 mt-0.5">Window closes</span>
            </div>

            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 opacity-0 group-hover:opacity-100 -mt-0.5 -mr-1"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Summary */}
          {moment.summary && (
            <p className="text-xs text-foreground/60 leading-relaxed line-clamp-2 mb-4">{moment.summary}</p>
          )}

          {/* Platform badges */}
          <div className="flex gap-1.5 mb-4">
            {moment.platform_targets.includes('linkedin') && (
              <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 text-[10px] font-mono-caps px-2 py-0.5 rounded-full border border-blue-500/20">
                <Linkedin size={9} /> LinkedIn
              </span>
            )}
            {moment.platform_targets.includes('x') && (
              <span className="flex items-center gap-1 bg-secondary text-muted-foreground text-[10px] font-mono-caps px-2 py-0.5 rounded-full border border-border">
                <Twitter size={9} /> X
              </span>
            )}
          </div>

          {/* Teammate share count + avatars */}
          <div className="flex items-center gap-2 mb-3">
            {moment.sharers && moment.sharers.length > 0 ? (
              <>
                {/* Stacked avatars */}
                <div className="flex items-center">
                  {moment.sharers.slice(0, 10).map((sharer, i) => {
                    const opacity = Math.max(0.25, 1 - i * 0.08)
                    return (
                      <div
                        key={i}
                        title={sharer.name || 'Teammate'}
                        className="h-5 w-5 rounded-full ring-1 ring-background overflow-hidden bg-secondary flex items-center justify-center shrink-0"
                        style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i, opacity }}
                      >
                        {sharer.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sharer.avatar_url} alt={sharer.name || ''} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[8px] font-bold text-muted-foreground">
                            {(sharer.name || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <span className="text-xs text-muted-foreground">
                  {moment.share_count === 1 ? '1 teammate shared this' : `${moment.share_count} teammates shared this`}
                </span>
              </>
            ) : (
              <>
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Be the first to share this</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-[10px] text-muted-foreground font-mono-caps">Time-limited</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShareOpen(true) }}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors group-hover:gap-2.5"
            >
              Share <span className="transition-all">→</span>
            </button>
          </div>
        </div>
      </motion.div>

      <ShareModal
        pkg={pkg}
        momentId={moment.id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        cta={moment.parsed_content?.call_to_action}
        ctaUrl={moment.parsed_content?.cta_url}
        mediaAssets={moment.parsed_content?.media_assets}
        momentDifferentiators={momentDifferentiators}
        onShared={handleShared}
      />
    </>
  )
}
