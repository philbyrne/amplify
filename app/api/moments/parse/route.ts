export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import type { MediaAsset } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function getMediaType(url: string): MediaAsset['type'] | null {
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) return 'image'
  if (/googleusercontent\.com|ggpht\.com/.test(url)) return 'image'
  if (/\.(mp4|mov|avi|webm)(\?|$)/i.test(url)) return 'video'
  if (/youtube\.com|youtu\.be|loom\.com|vimeo\.com/.test(url)) return 'video'
  if (/drive\.google\.com|docs\.google\.com\/(?!document)/.test(url)) return 'drive'
  return null
}

// If the URL alone returns a coarse type (e.g. 'drive'), check the link caption
// text for a more specific classification.
function refineTypeFromCaption(caption: string, urlType: MediaAsset['type']): MediaAsset['type'] {
  const c = caption.toLowerCase()
  if (/animation|motion graphic|animated/.test(c)) return 'animation'
  if (/video|demo video|demo|reel|recording|walkthrough|loom/.test(c)) return 'video'
  if (/image|photo|screenshot|graphic|banner|thumbnail/.test(c)) return 'image'
  // 'link' caption keywords stay as-is or keep url type
  return urlType
}

function extractMediaLinks(html: string): MediaAsset[] {
  const assets: MediaAsset[] = []
  const seen = new Set<string>()

  // 1. Extract <a href> links (videos, drive files, image links)
  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].replace(/&amp;/g, '&')
    if (href.startsWith('#') || href.includes('accounts.google.com')) continue
    if (href.includes('google.com/url?')) {
      try {
        const inner = new URL(href).searchParams.get('q')
        if (inner) href = inner
      } catch { /* skip malformed URLs */ }
    }
    if (seen.has(href)) continue
    seen.add(href)
    const caption = match[2].replace(/<[^>]+>/g, '').trim()
    const urlType = getMediaType(href)
    // If the URL isn't a recognised media URL, check whether the caption name
    // clearly identifies a type (e.g. a link labelled "VIDEO" or "PRODUCT ANIMATION")
    const captionOnlyType = !urlType && caption ? refineTypeFromCaption(caption, 'link') : null
    const type = urlType ? refineTypeFromCaption(caption, urlType) : captionOnlyType
    if (!type) continue
    assets.push({ url: href, type, ...(caption ? { caption } : {}) })
  }

  // 2. Extract embedded <img> tags — Google Docs exports images as hosted URLs
  const imgRegex = /<img[^>]+src="(https?:[^"]+)"(?:[^>]+alt="([^"]*)")?[^>]*>/gi
  let imgMatch
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1].replace(/&amp;/g, '&')
    if (src.startsWith('data:')) continue // skip base64 blobs
    if (seen.has(src)) continue
    const type = getMediaType(src)
    if (type !== 'image') continue
    seen.add(src)
    const alt = (imgMatch[2] || '').trim()
    assets.push({ url: src, type: 'image', ...(alt ? { caption: alt } : {}) })
  }

  return assets
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessToken = (session as typeof session & { access_token?: string }).access_token
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Google access token. Please sign out and sign back in.' },
        { status: 401 }
      )
    }

    const { docUrl } = await req.json()
    if (!docUrl) return NextResponse.json({ error: 'docUrl is required' }, { status: 400 })

    const docId = extractDocId(docUrl)
    if (!docId) return NextResponse.json({ error: 'Could not extract document ID from URL' }, { status: 400 })

    // Export as HTML to capture links and structure
    const exportRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text%2Fhtml`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!exportRes.ok) {
      const body = await exportRes.text()
      console.error('Drive export error', exportRes.status, body)
      if (exportRes.status === 401 || exportRes.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. Make sure you have access to this doc, then sign out and back in.' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: `Could not fetch document (${exportRes.status}). Make sure the doc exists and you have access.` },
        { status: 422 }
      )
    }

    const html = await exportRes.text()
    if (!html?.trim()) return NextResponse.json({ error: 'Document appears to be empty' }, { status: 422 })

    const mediaAssets = extractMediaLinks(html)
    const docText = htmlToText(html)

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are parsing an internal product announcement or sharing moment document for Intercom employees.

Extract the key information and return a JSON object with exactly these fields:
- "title": string — short, compelling title (max 10 words) for this sharing moment
- "summary": string — 1-2 sentences describing what this is about, suitable for a preview card
- "background": string — 2-3 sentences of context/background about this announcement
- "key_messages": string[] — 3-5 key messages employees should understand and communicate
- "talking_points": string[] — 3-5 specific, concrete talking points they can use in social posts
- "call_to_action": string — ONE sentence (max 20 words) written in CUSTOMER-FACING language — as if speaking directly to a prospect or customer, not to the employee sharing it. This copy will be used to generate the social post itself, so it must read like something a customer would find compelling, not an internal instruction like "share this with your network". For example: "If you want a calendar full of leads, visit fin.ai/sales" — NOT "Share fin.ai/sales with your audience if this resonates". No compound sentences, no "and also…" additions.
- "cta_url": string | null — the specific URL employees should share in their posts (the destination link, blog post, landing page, etc). Extract the exact URL if present, otherwise null.

Document content:
${docText.slice(0, 12000)}

Return ONLY valid JSON with those exact fields. No preamble, no markdown.`,
      }],
    })

    const content = msg.content[0]
    if (content.type !== 'text') return NextResponse.json({ error: 'Failed to parse document' }, { status: 500 })

    let parsed
    try {
      parsed = JSON.parse(content.text)
    } catch {
      // Try to extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]+\}/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]) }
        catch { return NextResponse.json({ error: 'AI returned invalid JSON — try again' }, { status: 500 }) }
      } else {
        return NextResponse.json({ error: 'AI returned invalid JSON — try again' }, { status: 500 })
      }
    }

    if (mediaAssets.length > 0) {
      parsed.media_assets = mediaAssets
    }

    return NextResponse.json({ parsed, docId })
  } catch (err) {
    console.error('POST /api/moments/parse error:', err)
    return NextResponse.json({ error: 'Failed to parse document' }, { status: 500 })
  }
}
