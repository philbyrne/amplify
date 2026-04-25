'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FileText, Sparkles, Loader2, CheckCircle, AlertCircle,
  Linkedin, Twitter, HardDrive, X, Plus, Film, Image as ImageIcon,
  Link2, ExternalLink, Zap,
} from 'lucide-react'
import type { ParsedMomentContent, SharingMoment, MediaAsset } from '@/lib/types'

type ParsedState = ParsedMomentContent & { title: string; summary: string; priority?: 1 | 2 | 3 }

interface AssetGroup {
  type: MediaAsset['type']
  label: string
  Icon: React.ElementType
}

const ASSET_GROUPS: AssetGroup[] = [
  { type: 'image', label: 'Images', Icon: ImageIcon },
  { type: 'video', label: 'Videos', Icon: Film },
  { type: 'link',  label: 'Links',  Icon: Link2 },
  { type: 'drive', label: 'Files',  Icon: HardDrive },
]

interface Props {
  moment?: SharingMoment
}

export default function MomentForm({ moment }: Props) {
  const router = useRouter()
  const editing = !!moment

  const [docUrl, setDocUrl] = useState(moment?.doc_url || '')
  const [parsing, setParsing] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [parsed, setParsed] = useState<ParsedState | null>(
    moment?.parsed_content
      ? {
          title: moment.title,
          summary: moment.summary || '',
          background: moment.parsed_content.background,
          key_messages: moment.parsed_content.key_messages,
          talking_points: moment.parsed_content.talking_points,
          call_to_action: moment.parsed_content.call_to_action,
          cta_url: moment.parsed_content.cta_url,
          media_assets: moment.parsed_content.media_assets,
          priority: moment.parsed_content.priority ?? 1,
        }
      : null
  )
  const [parseError, setParseError] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(moment?.platform_targets || ['linkedin', 'x'])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Resize all textareas to fit content whenever parsed data changes
  useEffect(() => {
    if (!parsed) return
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((el) => {
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      })
    })
  }, [parsed])

  async function handleParse() {
    if (!docUrl.trim()) return
    setParsing(true)
    setParseError('')
    try {
      const res = await fetch('/api/moments/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docUrl: docUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setParseError(data.error || 'Failed to parse document'); return }
      if (parsed?.media_assets && !data.parsed.media_assets?.length) {
        data.parsed.media_assets = parsed.media_assets
      }
      setParsed(data.parsed)
    } catch {
      setParseError('Something went wrong. Please try again.')
    } finally {
      setParsing(false)
    }
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  function removeAsset(idx: number) {
    setParsed((p) => p ? { ...p, media_assets: p.media_assets?.filter((_, i) => i !== idx) } : p)
  }

  function changeAssetType(idx: number, newType: MediaAsset['type']) {
    setParsed((p) => {
      if (!p?.media_assets) return p
      const assets = [...p.media_assets]
      assets[idx] = { ...assets[idx], type: newType }
      return { ...p, media_assets: assets }
    })
  }

  function addAsset(type: MediaAsset['type']) {
    const url = prompt('Paste URL:')
    if (!url?.trim()) return
    const caption = prompt('Caption (optional, press Enter to skip):') || undefined
    setParsed((p) => p ? {
      ...p,
      media_assets: [...(p.media_assets || []), { url: url.trim(), type, ...(caption ? { caption } : {}) }],
    } : p)
  }

  async function handleSave() {
    if (!parsed || platforms.length === 0) return

    if (!parsed.cta_url?.trim()) {
      const proceed = window.confirm(
        "You haven't added a CTA link — this is the URL employees will share in their posts. Are you sure you want to publish without one?"
      )
      if (!proceed) return
    }

    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        title: parsed.title,
        summary: parsed.summary,
        parsed_content: {
          background: parsed.background,
          key_messages: parsed.key_messages,
          talking_points: parsed.talking_points,
          call_to_action: parsed.call_to_action,
          cta_url: parsed.cta_url || null,
          media_assets: parsed.media_assets || [],
          priority: parsed.priority ?? 1,
        },
        doc_url: docUrl.trim() || null,
        platform_targets: platforms,
      }

      const res = editing
        ? await fetch(`/api/moments/${moment!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/moments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json()
      if (!res.ok) { setSaveError(data.error || 'Failed to save'); return }
      router.push('/admin/moments')
    } catch {
      setSaveError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const textareaCls = `${inputCls} resize-none overflow-hidden`

  function autoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const ctaWordCount = (parsed?.call_to_action || '').trim().split(/\s+/).filter(Boolean).length
  const ctaOverLimit = ctaWordCount > 20

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6 items-start max-w-5xl">

      {/* ── Left column: form fields ── */}
      <div className="space-y-6">

        {/* Source document */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">{editing ? 'Source Document' : 'Sharing Moment Doc'}</h2>
          </div>
          {!editing && (
            <p className="text-sm text-muted-foreground">
              Paste a Google Doc link. The doc must be accessible by your Google account.
            </p>
          )}
          {!manualMode ? (
            <>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="flex-1 px-4 py-2.5 text-sm bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleParse}
                  disabled={!docUrl.trim() || parsing}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {parsing
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing…</>
                    : <><Sparkles className="h-3.5 w-3.5" /> {editing ? 'Re-parse' : 'Parse doc'}</>
                  }
                </button>
              </div>
              {parseError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {parseError}
                </div>
              )}
              {!editing && !parsed && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {!editing && !parsed && (
                <button
                  onClick={() => {
                    setManualMode(true)
                    setParsed({
                      title: '',
                      summary: '',
                      background: '',
                      key_messages: ['', '', ''],
                      talking_points: ['', '', ''],
                      call_to_action: '',
                      cta_url: undefined,
                      media_assets: [],
                      priority: 1,
                    })
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-xl transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Manually populate
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <p className="text-sm text-foreground font-medium">Manual entry mode</p>
              <button
                onClick={() => { setManualMode(false); setParsed(null) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Switch to doc parsing
              </button>
            </div>
          )}
        </div>

        {/* Parsed / editable content */}
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6 space-y-5"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h2 className="font-semibold text-foreground">{editing ? 'Edit content' : manualMode ? 'Fill in the details' : 'Parsed content'}</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                {manualMode ? 'Fill in everything below' : 'Review and edit before publishing'}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide">Title</label>
              <input type="text" value={parsed.title} className={inputCls}
                onChange={(e) => setParsed((p) => p ? { ...p, title: e.target.value } : p)} />
            </div>

            {/* CTA — before Summary */}
            <div className="space-y-2 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono-caps text-primary uppercase tracking-wide font-semibold">Call to Action</label>
                <span className={`text-[10px] font-mono tabular-nums ${ctaOverLimit ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                  {ctaWordCount}/20 words
                </span>
              </div>
              <textarea
                value={parsed.call_to_action}
                rows={1}
                className={`${textareaCls} ${ctaOverLimit ? 'border-red-500/50 focus:ring-red-500/50' : ''}`}
                placeholder="One sentence telling employees what to share."
                onInput={autoResize}
                onChange={(e) => setParsed((p) => p ? { ...p, call_to_action: e.target.value } : p)}
              />
              {ctaOverLimit && (
                <p className="text-[11px] text-red-400">Keep it to one sentence, max 20 words.</p>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">CTA URL <span className="italic">(the link employees will share)</span></label>
                  {!parsed.cta_url?.trim() && (
                    <span className="text-[10px] text-amber-500 font-medium">Recommended</span>
                  )}
                </div>
                <input
                  type="url"
                  value={parsed.cta_url || ''}
                  className={`${inputCls} ${!parsed.cta_url?.trim() ? 'border-amber-500/40 focus:ring-amber-500/50' : ''}`}
                  placeholder="https://..."
                  onChange={(e) => setParsed((p) => p ? { ...p, cta_url: e.target.value || undefined } : p)}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1">
              <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide">
                Summary <span className="normal-case">(shown on card)</span>
              </label>
              <textarea value={parsed.summary} rows={1} className={textareaCls}
                onInput={autoResize}
                onChange={(e) => setParsed((p) => p ? { ...p, summary: e.target.value } : p)} />
            </div>

            {/* Background */}
            <div className="space-y-1">
              <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide">Background</label>
              <textarea value={parsed.background} rows={1} className={textareaCls}
                onInput={autoResize}
                onChange={(e) => setParsed((p) => p ? { ...p, background: e.target.value } : p)} />
            </div>

            {/* Key messages */}
            <div className="space-y-2">
              <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide">Key messages</label>
              {parsed.key_messages.map((msg, i) => (
                <input key={i} type="text" value={msg} className={inputCls}
                  onChange={(e) => setParsed((p) => {
                    if (!p) return p
                    const km = [...p.key_messages]; km[i] = e.target.value
                    return { ...p, key_messages: km }
                  })} />
              ))}
            </div>

            {/* Talking points */}
            <div className="space-y-2">
              <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide">Talking points</label>
              {parsed.talking_points.map((pt, i) => (
                <input key={i} type="text" value={pt} className={inputCls}
                  onChange={(e) => setParsed((p) => {
                    if (!p) return p
                    const tp = [...p.talking_points]; tp[i] = e.target.value
                    return { ...p, talking_points: tp }
                  })} />
              ))}
            </div>

            {/* Priority & Platforms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide">Priority</label>
                <div className="flex gap-1.5">
                  {([1, 2, 3] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setParsed((p) => p ? { ...p, priority: lvl } : p)}
                      title={lvl === 1 ? 'Normal' : lvl === 2 ? 'Medium' : 'High priority'}
                      className={`flex items-center gap-0.5 px-2.5 py-2 rounded-xl border-2 transition-all ${
                        (parsed.priority ?? 1) === lvl
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {Array.from({ length: lvl }).map((_, i) => (
                        <Zap key={i} className={`h-3.5 w-3.5 ${(parsed.priority ?? 1) === lvl ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
                      ))}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono-caps text-muted-foreground uppercase tracking-wide">Platforms</label>
                <div className="flex gap-2">
                  <button onClick={() => togglePlatform('linkedin')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${platforms.includes('linkedin') ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-border bg-secondary text-muted-foreground'}`}>
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </button>
                  <button onClick={() => togglePlatform('x')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${platforms.includes('x') ? 'border-foreground bg-foreground text-background' : 'border-border bg-secondary text-muted-foreground'}`}>
                    <Twitter className="h-3.5 w-3.5" /> X
                  </button>
                </div>
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {saveError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {editing ? 'Changes go live immediately' : <>Expires in <span className="font-medium text-foreground">14 days</span></>}
              </p>
              <button
                onClick={handleSave}
                disabled={saving || platforms.length === 0}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : editing ? 'Save changes →' : 'Publish moment →'
                }
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Right column: media & links ── */}
      <div className="sticky top-6 space-y-4">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-sm">Media &amp; Links</h3>

          {!parsed ? (
            <p className="text-xs text-muted-foreground italic">
              Parse a doc to extract assets, or click &quot;Manually populate&quot; then add them here.
            </p>
          ) : (
            ASSET_GROUPS.map(({ type, label, Icon }) => {
              const assets = (parsed.media_assets || []).filter((a) => a.type === type)
              const allAssets = parsed.media_assets || []
              return (
                <div key={type} className="space-y-2">
                  {/* Group header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                      {assets.length > 0 && (
                        <span className="text-[10px] bg-secondary border border-border text-muted-foreground px-1.5 py-0.5 rounded-full tabular-nums">{assets.length}</span>
                      )}
                    </div>
                    <button
                      onClick={() => addAsset(type)}
                      className="flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  {/* Asset list */}
                  {assets.length > 0 ? (
                    <div className="space-y-1.5">
                      {assets.map((asset) => {
                        const idx = allAssets.indexOf(asset)
                        return (
                          <div key={idx} className="bg-secondary rounded-lg p-2.5 border border-border group space-y-1.5">
                            <div className="flex items-start gap-2">
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-0 hover:text-primary transition-colors"
                              >
                                <p className="text-xs text-foreground truncate">{asset.caption || asset.url}</p>
                                {asset.caption && (
                                  <p className="text-[10px] text-muted-foreground truncate">{asset.url}</p>
                                )}
                              </a>
                              <div className="flex items-center gap-1 shrink-0">
                                <a href={asset.url} target="_blank" rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground transition-colors">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                <button
                                  onClick={() => removeAsset(idx)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            {/* Type switcher */}
                            <div className="flex items-center gap-1">
                              {ASSET_GROUPS.map(({ type: t, Icon: TIcon }) => (
                                <button
                                  key={t}
                                  title={`Mark as ${t}`}
                                  onClick={() => changeAssetType(idx, t)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                    asset.type === t
                                      ? 'bg-primary/20 text-primary border border-primary/30'
                                      : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
                                  }`}
                                >
                                  <TIcon className="h-2.5 w-2.5" />
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 italic pl-0.5">None yet</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}
