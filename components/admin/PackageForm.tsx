'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Plus,
  X,
  Linkedin,
  Twitter,
  Link2,
  FileText,
  Tag,
  Save,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import type { Package, Platform } from '@/lib/types'

interface Props {
  existingPackage?: Package
}

export default function PackageForm({ existingPackage }: Props) {
  const router = useRouter()
  const isEditing = !!existingPackage

  const [title, setTitle] = useState(existingPackage?.title || '')
  const [description, setDescription] = useState(existingPackage?.description || '')
  const [body, setBody] = useState(existingPackage?.body || '')
  const [platforms, setPlatforms] = useState<Platform[]>(
    existingPackage?.platform_targets || ['linkedin', 'x']
  )
  const [driveFolderUrl, setDriveFolderUrl] = useState(
    existingPackage?.drive_folder_url || ''
  )
  const [hasNoFiles, setHasNoFiles] = useState(
    existingPackage?.has_no_files || false
  )
  const [exampleCopies, setExampleCopies] = useState<string[]>(
    existingPackage?.example_copies || ['']
  )
  const [tags, setTags] = useState<string[]>(existingPackage?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState(
    existingPackage?.cover_image_url || ''
  )
  const [isActive, setIsActive] = useState(
    existingPackage?.is_active !== undefined ? existingPackage.is_active : true
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function updateExampleCopy(idx: number, value: string) {
    setExampleCopies((prev) => prev.map((c, i) => (i === idx ? value : c)))
  }

  function addExampleCopy() {
    setExampleCopies((prev) => [...prev, ''])
  }

  function removeExampleCopy(idx: number) {
    setExampleCopies((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (platforms.length === 0) {
      setError('Select at least one platform.')
      return
    }

    setSaving(true)

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      body: body.trim() || null,
      platform_targets: platforms,
      drive_folder_url: driveFolderUrl.trim() || null,
      has_no_files: hasNoFiles,
      example_copies: exampleCopies.filter((c) => c.trim() !== ''),
      tags,
      cover_image_url: coverImageUrl.trim() || null,
      is_active: isActive,
    }

    try {
      const url = isEditing
        ? `/api/packages/${existingPackage.id}`
        : '/api/packages'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save package.')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-4 py-2.5 text-sm border border-border bg-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <button
        type="button"
        onClick={() => router.push('/admin')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to packages
      </button>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Title */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Content Details
        </h2>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Intercom Fin AI Launch — May 2024"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Short description{' '}
            <span className="text-muted-foreground font-normal">(shown on card)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One-line summary employees will see on the card"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Full brief{' '}
            <span className="text-muted-foreground font-normal">
              (used by AI for copy generation)
            </span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Describe what this content is about, key messages, target audience, etc. The more context you give, the better the AI-generated copy will be."
            className={`${inputClass} resize-none leading-relaxed`}
          />
        </div>
      </div>

      {/* Platforms */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">
          Target Platforms <span className="text-destructive">*</span>
        </h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => togglePlatform('linkedin')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
              platforms.includes('linkedin')
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-border text-muted-foreground hover:border-border/80'
            }`}
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </button>
          <button
            type="button"
            onClick={() => togglePlatform('x')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
              platforms.includes('x')
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-border/80'
            }`}
          >
            <Twitter className="h-4 w-4" />X (Twitter)
          </button>
        </div>
      </div>

      {/* Assets */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Google Drive Assets
        </h2>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasNoFiles"
            checked={hasNoFiles}
            onChange={(e) => setHasNoFiles(e.target.checked)}
            className="rounded accent-primary"
          />
          <label htmlFor="hasNoFiles" className="text-sm text-foreground">
            This package has no attached files
          </label>
        </div>

        {!hasNoFiles && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Google Drive folder URL
            </label>
            <input
              type="url"
              value={driveFolderUrl}
              onChange={(e) => setDriveFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Share the folder with your service account email so Amplify can
              list files.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Cover image URL{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Example copies */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Example Copy Starters{' '}
            <span className="text-muted-foreground font-normal text-sm">
              (optional — helps the AI)
            </span>
          </h2>
          <button
            type="button"
            onClick={addExampleCopy}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {exampleCopies.map((copy, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={copy}
                onChange={(e) => updateExampleCopy(idx, e.target.value)}
                placeholder={`Example ${idx + 1} — a sample opening line or post style`}
                className={inputClass}
              />
              {exampleCopies.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExampleCopy(idx)}
                  className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          Tags
        </h2>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full font-mono-caps"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Type a tag and press Enter"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Active toggle */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Active</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active packages appear in the employee feed
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isActive ? 'bg-primary' : 'bg-secondary border border-border'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-foreground rounded-full shadow-sm transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pb-8">
        <motion.button
          type="submit"
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Package'}
        </motion.button>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="px-6 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
