export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import type { VoiceProfile } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FALLBACK_POSTS = [
  "Really proud of the work our team shipped this week. When you have clear user problems to solve, great product follows naturally.",
  "The best customer conversations aren't about features — they're about outcomes. What are you trying to achieve?",
  "Three years at Intercom and I'm still learning something new every week. That's rare.",
  "Shipping is a skill. So is knowing when NOT to ship.",
  "Hot take: most dashboards show you what happened. The best ones help you decide what to do next.",
]

interface ApifyProfileData {
  firstName?: string
  lastName?: string
  headline?: string
  about?: string
  currentPosition?: Array<{ companyName?: string }>
  experience?: Array<{ title?: string; companyName?: string; description?: string }>
}

async function fetchViaApify(linkedinUrl: string): Promise<string[]> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return []

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/harvestapi~linkedin-profile-posts/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrls: [linkedinUrl], maxPosts: 30 }),
        signal: AbortSignal.timeout(90000),
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : [])
      .map((p: { text?: string; content?: string }) => p.content ?? p.text ?? '')
      .filter((t: string) => t.length > 40)
      .reverse()
      .slice(0, 30)
  } catch {
    return []
  }
}

async function fetchLinkedInProfile(linkedinUrl: string): Promise<ApifyProfileData | null> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return null

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/harvestapi~linkedin-profile-scraper/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [linkedinUrl] }),
        signal: AbortSignal.timeout(90000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return data[0] as ApifyProfileData
  } catch {
    return null
  }
}

async function generateAudienceContext(profile: ApifyProfileData): Promise<string> {
  try {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
    const currentCompany = profile.currentPosition?.[0]?.companyName ?? ''
    const experienceTitles = (profile.experience ?? [])
      .map((e) => e.title)
      .filter(Boolean)
      .join(', ')

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Based on this LinkedIn profile, write 2-3 sentences describing who is likely in this person's professional network — their seniority, roles, and what they care about professionally. Be specific.

Profile:
Name: ${name}
Headline: ${profile.headline ?? ''}
About: ${profile.about ?? ''}
Current role: ${currentCompany}
Experience: ${experienceTitles}

Write the audience analysis directly.`,
      }],
    })
    const content = msg.content[0]
    return content.type === 'text' ? content.text.trim() : ''
  } catch {
    return ''
  }
}

async function generateVoiceAppraisal(posts: string[]): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Analyse these LinkedIn posts and write a brief voice appraisal (3-4 sentences) describing this person's writing style, tone, and what they tend to care about. Be specific and insightful — this will be used to help generate social copy in their voice.

Posts:
${posts.map((p, i) => `${i + 1}. "${p}"`).join('\n\n')}

Write the appraisal directly, no preamble.`,
      }],
    })
    const content = msg.content[0]
    return content.type === 'text' ? content.text.trim() : ''
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let linkedinUrl = searchParams.get('linkedinUrl')

    if (!linkedinUrl) {
      return NextResponse.json({ error: 'linkedinUrl query param required' }, { status: 400 })
    }

    if (!linkedinUrl.startsWith('http')) {
      linkedinUrl = 'https://' + linkedinUrl
    }

    if (!linkedinUrl.includes('linkedin.com/in/')) {
      return NextResponse.json(
        { error: 'Must be a LinkedIn profile URL (linkedin.com/in/...)' },
        { status: 400 }
      )
    }

    const [fetchedPosts, linkedInProfile] = await Promise.all([
      fetchViaApify(linkedinUrl),
      fetchLinkedInProfile(linkedinUrl),
    ])

    let posts = fetchedPosts
    let usedFallback = false

    if (posts.length === 0) {
      posts = FALLBACK_POSTS.slice(0, 5)
      usedFallback = true
    }

    const [voiceAppraisal, audienceContext] = await Promise.all([
      generateVoiceAppraisal(posts),
      linkedInProfile ? generateAudienceContext(linkedInProfile) : Promise.resolve(''),
    ])

    const currentCompany = linkedInProfile?.currentPosition?.[0]?.companyName ?? ''
    const headline = linkedInProfile?.headline ?? ''
    const experienceSummary = headline && currentCompany
      ? `${headline} at ${currentCompany}`
      : headline || currentCompany || ''

    const voiceProfile: VoiceProfile = {
      posts,
      tone_notes: voiceAppraisal || (usedFallback
        ? 'Using sample posts — could not retrieve LinkedIn posts.'
        : `Loaded ${posts.length} posts from LinkedIn.`),
      last_synced: new Date().toISOString(),
      ...(audienceContext ? { audience_context: audienceContext } : {}),
      ...(experienceSummary ? { experience_summary: experienceSummary } : {}),
    }

    const supabase = getAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await supabase
      .from('users')
      .update({ voice_profile: voiceProfile, linkedin_url: linkedinUrl })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      postsFound: posts.length,
      usedFallback,
      appraisal: voiceAppraisal,
      audienceContext,
      message: usedFallback
        ? 'Could not retrieve LinkedIn posts — sample posts loaded.'
        : `Loaded ${posts.length} posts and generated your voice profile${audienceContext ? ' and audience context' : ''}.`,
    })
  } catch (err) {
    console.error('GET /api/voice/scrape error:', err)
    return NextResponse.json({ error: 'Failed to scrape LinkedIn profile' }, { status: 500 })
  }
}
