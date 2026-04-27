'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import * as SliderPrimitive from '@radix-ui/react-slider'
import {
  X, RefreshCw, Linkedin, Twitter, Sparkles, CheckCircle, Copy, Check,
  FileText, Image, Film, ExternalLink, Link2, HardDrive, Download,
  Clapperboard, ChevronRight,
} from 'lucide-react'
import type { Package, DriveFile, Platform, VoiceProfile, MediaAsset } from '@/lib/types'
import { useSession } from 'next-auth/react'
import { buildLinkedInShareUrl, buildXShareUrl } from '@/lib/utm'

let confettiFn: ((opts: object) => void) | null = null
if (typeof window !== 'undefined') {
  import('canvas-confetti').then((m) => { confettiFn = m.default })
}

interface Props {
  pkg: Package
  open: boolean
  onClose: () => void
  momentId?: string
  mediaAssets?: MediaAsset[]
  cta?: string
  ctaUrl?: string
  momentDifferentiators?: string[]
  onShared?: () => void
}

interface SessionUser { id?: string; voice_profile?: VoiceProfile | null }

function getMimeIcon(mimeType: string | null) {
  if (!mimeType) return FileText
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  return FileText
}

const ASSET_TYPE_ICONS: Record<MediaAsset['type'], React.ElementType> = {
  image: Image,
  video: Film,
  animation: Clapperboard,
  link: Link2,
  drive: HardDrive,
}

const ASSET_TYPE_LABELS: Record<MediaAsset['type'], string> = {
  image: 'Image',
  video: 'Video',
  animation: 'Animation',
  link: 'Link',
  drive: 'File',
}

const BRAND_DIFFERENTIATORS = ['AI-first', 'Customer-centric', 'Fastest in class', 'Enterprise-ready', 'Global scale']
const BRIEF_LIMIT = 120

interface ToneSliderProps {
  label: string; left: string; right: string; value: number
  onChange: (v: number) => void; disabled?: boolean; hint?: string
}
function ToneSlider({ label, left, right, value, onChange, disabled = false, hint }: ToneSliderProps) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
        <span>{left}</span>
        <span className="font-medium text-foreground">{label}</span>
        <span>{right}</span>
      </div>
      <SliderPrimitive.Root
        min={0} max={100} step={1} value={[value]}
        onValueChange={([v]) => onChange(v)} disabled={disabled}
        className="relative flex items-center select-none touch-none w-full h-5"
      >
        <SliderPrimitive.Track className="bg-secondary relative grow rounded-full h-1.5 border border-border">
          <SliderPrimitive.Range className="absolute bg-primary rounded-full h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block w-4 h-4 bg-background border-2 border-primary rounded-full shadow-sm cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </SliderPrimitive.Root>
      {hint && <p className="text-[10px] text-muted-foreground mt-1.5 italic leading-tight">{hint}</p>}
    </div>
  )
}

export default function ShareModal({ pkg, open, onClose, momentId, mediaAssets, cta, ctaUrl, momentDifferentiators, onShared }: Props) {
  const { data: session } = useSession()
  const sessionUser = session?.user as SessionUser | undefined

  const [platform, setPlatform] = useState<Platform>('linkedin')
  const [copy, setCopy] = useState('')
  const [generating, setGenerating] = useState(false)
  const [variationIndex, setVariationIndex] = useState(0)
  const [formalityScore, setFormalityScore] = useState(50)
  const [voiceInfluenceScore, setVoiceInfluenceScore] = useState(70)
  const [audienceScore, setAudienceScore] = useState(60)
  const [lengthTarget, setLengthTarget] = useState(500)
  const [selectedDiffs, setSelectedDiffs] = useState<string[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [shared, setShared] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedOverlay, setCopiedOverlay] = useState(false)
  const [briefExpanded, setBriefExpanded] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [ctaUrlCopied, setCtaUrlCopied] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null)

  // Asset picker state
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [assetPicked, setAssetPicked] = useState(false)

  // Top 5 assets sorted by richness: image > video > animation > link > drive
  const topAssets = useMemo(() => {
    if (!mediaAssets?.length) return []
    const order: Record<string, number> = { image: 0, video: 1, animation: 2, link: 3, drive: 4 }
    return [...mediaAssets].sort((a, b) => (order[a.type] ?? 5) - (order[b.type] ?? 5)).slice(0, 5)
  }, [mediaAssets])

  const showAssetPicker = !assetPicked && topAssets.length > 0

  const differentiatorOptions = (momentDifferentiators && momentDifferentiators.length > 0)
    ? [...momentDifferentiators, ...BRAND_DIFFERENTIATORS.slice(0, 3)]
    : BRAND_DIFFERENTIATORS

  const isX = platform === 'x'
  const X_LIMIT = 140
  const effectiveLengthTarget = isX ? X_LIMIT : lengthTarget
  const charLimit = effectiveLengthTarget
  const charCount = copy.length
  const isDownloadable = selectedAsset && ['image', 'video', 'animation'].includes(selectedAsset.type)

  // Fetch fresh voice profile when modal opens
  useEffect(() => {
    if (!open) return
    fetch('/api/profile')
      .then((r) => r.json())
      .then((p) => { if (p.voice_profile) setVoiceProfile(p.voice_profile) })
      .catch(() => {
        if (sessionUser?.voice_profile) setVoiceProfile(sessionUser.voice_profile)
      })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setAssetPicked(false)
      setSelectedAsset(null)
      setCopy('')
      setShared(false)
      setCopiedOverlay(false)
      setShareUrl('')
    }
  }, [open])

  const generateCopy = useCallback(async () => {
    setGenerating(true)
    try {
      const assetContext = selectedAsset
        ? `"${selectedAsset.caption || ASSET_TYPE_LABELS[selectedAsset.type]}" (${selectedAsset.type})`
        : undefined

      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          packageId: pkg.id,
          packageTitle: pkg.title,
          packageBody: pkg.body || pkg.description || '',
          exampleCopies: pkg.example_copies || [],
          voiceProfile: voiceProfile || null,
          formalityScore,
          voiceInfluenceScore,
          audienceScore,
          lengthTarget: effectiveLengthTarget,
          cta: cta || null,
          ctaUrl: ctaUrl || null,
          differentiators: selectedDiffs,
          variationIndex,
          selectedAssetContext: assetContext,
        }),
      })
      const data = await res.json()
      if (data.copy) setCopy(data.copy)
    } catch {
      setCopy(pkg.example_copies?.[0] || `Just discovered something worth sharing — ${pkg.title}.`)
    } finally {
      setGenerating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, pkg.id, pkg.title, pkg.body, pkg.description, pkg.example_copies, formalityScore, voiceInfluenceScore, audienceScore, lengthTarget, selectedDiffs, variationIndex, voiceProfile, selectedAsset])

  const loadDriveFiles = useCallback(async () => {
    if (pkg.has_no_files || !pkg.drive_folder_url) return
    setLoadingFiles(true)
    try {
      const res = await fetch(`/api/drive/${pkg.id}`)
      const data = await res.json()
      setDriveFiles(data.files || [])
    } catch { /* silently fail */ }
    finally { setLoadingFiles(false) }
  }, [pkg.id, pkg.has_no_files, pkg.drive_folder_url])

  // Trigger copy generation once asset is picked (or immediately if no picker)
  useEffect(() => {
    if (open && !showAssetPicker) {
      generateCopy()
      loadDriveFiles()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, platform, assetPicked])

  useEffect(() => {
    if (open && variationIndex > 0) generateCopy()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variationIndex])

  async function handleShare(p: Platform) {
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: momentId ? undefined : pkg.id,
          momentId: momentId || undefined,
          platform: p,
          copyUsed: copy,
        }),
      })
      const data = await res.json()
      const resolvedUrl = data.shareUrl || ctaUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://www.intercom.com'
      setShareUrl(resolvedUrl)

      // Copy post text (no URL embedded — it goes in first comment)
      try { await navigator.clipboard.writeText(copy) } catch { /* ignore */ }

      setCopiedOverlay(true)
      const shareHref = p === 'linkedin' ? buildLinkedInShareUrl(copy, resolvedUrl) : buildXShareUrl(copy)

      setTimeout(() => {
        setCopiedOverlay(false)
        window.open(shareHref, '_blank', 'width=620,height=600,noopener,noreferrer')
        setShared(true)
        onShared?.()
        window.postMessage({ type: 'AMPLIFY_SHARED' }, '*')
        if (confettiFn) confettiFn({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#ffffff', '#c7d2fe'] })
        setTimeout(() => { setShared(false); onClose() }, 5000)
      }, 500)
    } catch {
      try { await navigator.clipboard.writeText(copy) } catch { /* ignore */ }
      const shareHref = p === 'linkedin' ? buildLinkedInShareUrl(copy) : buildXShareUrl(copy)
      window.open(shareHref, '_blank', 'width=620,height=600,noopener,noreferrer')
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(copy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyCtaUrl() {
    if (!ctaUrl) return
    await navigator.clipboard.writeText(ctaUrl)
    setCtaUrlCopied(true)
    setTimeout(() => setCtaUrlCopied(false), 2000)
  }

  const progressPct = Math.min((charCount / charLimit) * 100, 100)
  const progressColor = charCount > charLimit ? '#ef4444' : charCount > charLimit * 0.9 ? '#f59e0b' : '#6366f1'

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-6xl max-h-[94vh] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col focus:outline-none"
          onInteractOutside={onClose}
        >
          {/* ── Overlays ── */}
          <AnimatePresence>
            {copiedOverlay && (
              <motion.div key="copied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-card/95 backdrop-blur flex flex-col items-center justify-center">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="h-10 w-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-medium text-foreground">Post copied to clipboard!</h3>
                    <p className="text-muted-foreground">Opening {platform === 'linkedin' ? 'LinkedIn' : 'X'} now…</p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {shared && (
              <motion.div key="shared" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-card/95 backdrop-blur flex flex-col items-center justify-center p-8">
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center gap-5 w-full max-w-sm">
                  <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-medium text-foreground">Awesome! +10 points!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Your post is open — paste and publish!</p>
                  </div>

                  {/* CTA URL for first comment */}
                  {ctaUrl && (
                    <div className="w-full bg-secondary border border-border rounded-2xl p-4 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Paste this link in your first comment
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 leading-snug">
                        Links in comments get full reach — LinkedIn suppresses posts with external links.
                      </p>
                      <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
                        <span className="flex-1 text-xs text-primary truncate">{ctaUrl}</span>
                        <button onClick={copyCtaUrl}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                          {ctaUrlCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Download nudge */}
                  {isDownloadable && selectedAsset && (
                    <a href={selectedAsset.url} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 hover:bg-primary/10 transition-colors group">
                      <Download className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-primary">Download &amp; attach your asset</p>
                        <p className="text-[10px] text-muted-foreground truncate">{selectedAsset.caption || 'Open asset'}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary/60 transition-colors shrink-0" />
                    </a>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card shrink-0">
            <div>
              <h2 className="text-lg font-medium text-foreground leading-tight">{pkg.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showAssetPicker
                  ? 'Pick an asset — your post will be tailored to it'
                  : 'Craft your post, then share it in one click'}
              </p>
            </div>
            <Dialog.Close className="rounded-full p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" onClick={onClose}>
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {/* ── 3-column body ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: Brief & assets */}
            <div className="w-64 shrink-0 border-r border-border flex flex-col bg-background/40 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Platform selector */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Share on</p>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => setPlatform('linkedin')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${platform === 'linkedin' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-border bg-secondary text-muted-foreground hover:border-border/80'}`}>
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </button>
                    {pkg.platform_targets.includes('x') && (
                      <button onClick={() => setPlatform('x')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${platform === 'x' ? 'border-foreground bg-foreground text-background' : 'border-border bg-secondary text-muted-foreground hover:border-border/80'}`}>
                        <Twitter className="h-3.5 w-3.5" /> X
                      </button>
                    )}
                  </div>
                </div>

                {/* CTA */}
                {(cta || ctaUrl) && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Call to action</p>
                    {cta && (
                      <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 leading-snug mb-1.5">{cta}</p>
                    )}
                    {ctaUrl && (
                      <a href={ctaUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-foreground bg-secondary border border-border rounded-xl px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors group">
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="truncate">{ctaUrl}</span>
                      </a>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5 leading-snug italic">
                      Link goes in your first comment for full reach
                    </p>
                  </div>
                )}

                {/* Brief */}
                {pkg.body && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Brief</p>
                    <div className="text-xs text-foreground leading-relaxed bg-secondary rounded-xl p-3 border border-border space-y-1.5">
                      {briefExpanded || pkg.body.length <= BRIEF_LIMIT ? (
                        <>
                          {pkg.body.split('\n\n').filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
                          {pkg.body.length > BRIEF_LIMIT && (
                            <button onClick={() => setBriefExpanded(false)} className="text-muted-foreground text-[10px] hover:text-foreground transition-colors mt-0.5">Collapse ↑</button>
                          )}
                        </>
                      ) : (
                        <>
                          <p>{pkg.body.slice(0, BRIEF_LIMIT)}…</p>
                          <button onClick={() => setBriefExpanded(true)} className="text-primary text-[10px] hover:text-primary/80 transition-colors font-medium">See full brief…</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Drive files */}
                {pkg.drive_folder_url && !pkg.has_no_files && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Assets</p>
                    {loadingFiles ? (
                      <div className="space-y-1.5">{[1,2].map((i) => <div key={i} className="h-8 bg-secondary rounded-lg border border-border animate-pulse" />)}</div>
                    ) : driveFiles.length > 0 ? (
                      <div className="space-y-1.5">
                        {driveFiles.map((f) => {
                          const Icon = getMimeIcon(f.mime_type)
                          return (
                            <a key={f.id} href={f.web_view_link || '#'} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-secondary rounded-lg border border-border hover:border-primary/40 transition-all text-xs text-foreground hover:text-primary group">
                              <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate flex-1">{f.name}</span>
                              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
                            </a>
                          )
                        })}
                      </div>
                    ) : <p className="text-xs text-muted-foreground italic">No files found</p>}
                  </div>
                )}

                {/* Tags */}
                {pkg.tags && pkg.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pkg.tags.map((tag) => (
                      <span key={tag} className="bg-secondary text-muted-foreground text-[10px] px-2 py-0.5 rounded-full border border-border font-mono-caps">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Center: Asset picker OR Copy editor ── */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-border">

              {showAssetPicker ? (
                /* ── Step 1: Pick an asset ── */
                <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
                  <div>
                    <p className="text-base font-semibold text-foreground">Which of these would you like to post about?</p>
                    <p className="text-xs text-muted-foreground mt-1">Your post copy will be tailored to the asset you choose.</p>
                  </div>

                  <div className="space-y-2 flex-1">
                    {topAssets.map((asset, i) => {
                      const Icon = ASSET_TYPE_ICONS[asset.type]
                      return (
                        <button
                          key={i}
                          onClick={() => { setSelectedAsset(asset); setAssetPicked(true) }}
                          className="w-full flex items-center gap-4 p-4 bg-secondary hover:bg-accent border border-border hover:border-primary/40 rounded-2xl text-left transition-all group"
                        >
                          <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-snug truncate">
                              {asset.caption || ASSET_TYPE_LABELS[asset.type]}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{asset.url}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-medium text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full uppercase tracking-wide">
                              {ASSET_TYPE_LABELS[asset.type]}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => { setSelectedAsset(null); setAssetPicked(true) }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 text-center"
                  >
                    Skip — write a general post about this moment
                  </button>
                </div>

              ) : (
                /* ── Step 2: Copy editor ── */
                <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">

                  {/* Selected asset banner */}
                  {selectedAsset && (
                    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
                      {(() => { const Icon = ASSET_TYPE_ICONS[selectedAsset.type]; return <Icon className="h-4 w-4 text-primary shrink-0" /> })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary truncate">{selectedAsset.caption || ASSET_TYPE_LABELS[selectedAsset.type]}</p>
                      </div>
                      <button
                        onClick={() => { setAssetPicked(false); setSelectedAsset(null); setCopy('') }}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Your post</p>
                    <div className="flex items-center gap-3">
                      <button onClick={copyToClipboard} disabled={!copy || generating}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors disabled:opacity-40">
                        {copied ? <><Check className="h-3.5 w-3.5 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                      </button>
                      <button onClick={() => setVariationIndex((v) => v + 1)} disabled={generating}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors">
                        <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                        New variation
                      </button>
                    </div>
                  </div>

                  {generating ? (
                    <div className="flex-1 min-h-[280px] bg-secondary rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-3">
                      <div className="flex gap-1.5">
                        {[0,1,2].map((i) => (
                          <motion.div key={i} className="h-2 w-2 bg-primary rounded-full"
                            animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">Generating in your voice...</p>
                    </div>
                  ) : (
                    <textarea
                      value={copy}
                      onChange={(e) => {
                        const val = isX ? e.target.value.slice(0, X_LIMIT) : e.target.value
                        setCopy(val)
                      }}
                      maxLength={isX ? X_LIMIT : undefined}
                      className="flex-1 min-h-[280px] w-full p-4 text-sm text-foreground bg-background border border-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                      placeholder="Your AI-personalised post will appear here..."
                    />
                  )}

                  {/* Char count */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, backgroundColor: progressColor }} />
                    </div>
                    <span className={`text-xs font-mono font-medium tabular-nums shrink-0 ${charCount > charLimit ? 'text-red-500' : charCount > charLimit * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {charCount.toLocaleString()}/{charLimit.toLocaleString()}
                    </span>
                  </div>

                  {/* Download nudge */}
                  {isDownloadable && selectedAsset && copy && !generating && (
                    <a href={selectedAsset.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 rounded-xl px-4 py-3 transition-colors group">
                      <Download className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Download asset to attach to your post</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{selectedAsset.caption || 'Click to open asset'}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-amber-500/60 transition-colors shrink-0" />
                    </a>
                  )}

                  {/* Voice indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-xl p-3">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {voiceProfile
                        ? `Personalised from ${voiceProfile.posts.length} of your LinkedIn posts ✓`
                        : 'Connect LinkedIn in your profile for copy in your voice'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Sliders & controls (hidden during asset pick) ── */}
            {!showAssetPicker && (
              <div className="w-60 shrink-0 flex flex-col overflow-y-auto">
                <div className="p-4 space-y-5">

                  {/* Post length */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Post length</p>
                    {isX ? (
                      <div className="flex items-center justify-between bg-secondary border border-border rounded-xl px-3 py-2">
                        <span className="text-xs text-muted-foreground">X limit</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">140 chars</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
                          <span>Short</span>
                          <span className="font-medium text-foreground tabular-nums">{lengthTarget} chars</span>
                          <span>Long</span>
                        </div>
                        <SliderPrimitive.Root
                          min={50} max={1500} step={50} value={[lengthTarget]}
                          onValueChange={([v]) => setLengthTarget(v)}
                          className="relative flex items-center select-none touch-none w-full h-5"
                        >
                          <SliderPrimitive.Track className="bg-secondary relative grow rounded-full h-1.5 border border-border">
                            <SliderPrimitive.Range className="absolute bg-primary rounded-full h-full" />
                          </SliderPrimitive.Track>
                          <SliderPrimitive.Thumb className="block w-4 h-4 bg-background border-2 border-primary rounded-full shadow-sm cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </SliderPrimitive.Root>
                      </>
                    )}
                  </div>

                  <div className="border-t border-border" />

                  {/* Tone */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" /> Tone
                    </p>
                    <ToneSlider label="Style" left="Casual" right="Professional" value={formalityScore} onChange={setFormalityScore} />
                    <ToneSlider label="Your voice" left="Generic" right="You" value={voiceInfluenceScore} onChange={setVoiceInfluenceScore}
                      disabled={!voiceProfile}
                      hint={voiceProfile?.tone_notes ? voiceProfile.tone_notes.slice(0, 60) + (voiceProfile.tone_notes.length > 60 ? '…' : '') : !voiceProfile ? 'Connect LinkedIn in profile →' : undefined}
                    />
                    <ToneSlider label="Audience" left="Broad" right="Your network" value={audienceScore} onChange={setAudienceScore}
                      disabled={!voiceProfile?.audience_context}
                      hint={voiceProfile?.audience_context ? voiceProfile.audience_context.slice(0, 60) + (voiceProfile.audience_context.length > 60 ? '…' : '') : undefined}
                    />
                  </div>

                  <div className="border-t border-border" />

                  {/* Differentiators */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Emphasise</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {differentiatorOptions.map((d) => (
                        <button key={d}
                          onClick={() => setSelectedDiffs((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${selectedDiffs.includes(d) ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/50 bg-secondary'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setVariationIndex((v) => v + 1)}
                      disabled={generating}
                      className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                      Apply &amp; regenerate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-8 py-4 border-t border-border bg-card flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              {showAssetPicker
                ? <span>Up to <span className="font-semibold text-foreground">{topAssets.length}</span> assets to choose from</span>
                : <>Sharing earns you <span className="font-semibold text-primary">+10 points</span></>
              }
            </p>
            {!showAssetPicker && (
              <div className="flex gap-3">
                {pkg.platform_targets.includes('linkedin') && (
                  <motion.button onClick={() => handleShare('linkedin')} disabled={charCount > charLimit || generating || shared}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    <Linkedin className="h-4 w-4" /> Share on LinkedIn
                  </motion.button>
                )}
                {pkg.platform_targets.includes('x') && (
                  <motion.button onClick={() => handleShare('x')} disabled={charCount > charLimit || generating || shared}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    <Twitter className="h-4 w-4" /> Post on X
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
