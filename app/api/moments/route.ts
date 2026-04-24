export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const view = new URL(req.url).searchParams.get('view') || 'active'

    const supabase = getAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let moments: Record<string, unknown>[] = []

    if (view === 'expired') {
      const now = new Date().toISOString()

      // Get dismissed moment IDs for this user
      const { data: dismissed } = await supabase
        .from('dismissed_moments')
        .select('moment_id')
        .eq('user_id', user.id)
      const dismissedIds = (dismissed || []).map((d) => d.moment_id as string).filter(Boolean)

      // Expired moments (all users see these)
      const { data: expiredData, error } = await supabase
        .from('sharing_moments')
        .select('*')
        .eq('is_active', true)
        .lte('expires_at', now)
        .order('expires_at', { ascending: false })
        .limit(20)
      if (error) throw error

      // Dismissed-but-still-active moments for this user
      let dismissedActive: Record<string, unknown>[] = []
      if (dismissedIds.length > 0) {
        const { data: dismissedData } = await supabase
          .from('sharing_moments')
          .select('*')
          .eq('is_active', true)
          .gt('expires_at', now)
          .in('id', dismissedIds)
          .order('created_at', { ascending: false })
        dismissedActive = dismissedData || []
      }

      // Merge, deduplicate (a moment could be both expired and dismissed)
      const seen = new Set<string>()
      moments = [...(expiredData || []), ...dismissedActive].filter((m) => {
        const id = m.id as string
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
    } else if (view === 'shared') {
      // Moments the current user has previously shared
      const { data: shares } = await supabase
        .from('shares')
        .select('moment_id')
        .eq('user_id', user.id)
        .not('moment_id', 'is', null)
      const rawIds = (shares || []).map((s) => s.moment_id).filter(Boolean)
      const sharedIds = rawIds.filter((id, idx) => rawIds.indexOf(id) === idx)
      if (sharedIds.length > 0) {
        const { data, error } = await supabase
          .from('sharing_moments')
          .select('*')
          .in('id', sharedIds)
          .order('created_at', { ascending: false })
        if (error) throw error
        moments = data || []
      }
    } else {
      // Active: non-expired, non-dismissed moments
      const { data: dismissed } = await supabase
        .from('dismissed_moments')
        .select('moment_id')
        .eq('user_id', user.id)
      const dismissedIds = (dismissed || []).map((d) => d.moment_id)

      let query = supabase
        .from('sharing_moments')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (dismissedIds.length > 0) {
        query = query.not('id', 'in', `(${dismissedIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      moments = data || []
    }

    // Attach share counts + sharer avatars (up to 10 per moment)
    const momentIds = moments.map((m) => m.id as string)
    const shareCountMap: Record<string, number> = {}
    const sharersMap: Record<string, { name: string | null; avatar_url: string | null }[]> = {}

    if (momentIds.length > 0) {
      const { data: shares } = await supabase
        .from('shares')
        .select('moment_id, user_id')
        .in('moment_id', momentIds)

      const userIds = [...new Set((shares || []).map((s) => s.user_id).filter(Boolean))]
      let userMap: Record<string, { name: string | null; avatar_url: string | null }> = {}

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', userIds)
        for (const u of users || []) userMap[u.id] = { name: u.name, avatar_url: u.avatar_url }
      }

      for (const s of shares || []) {
        if (!s.moment_id) continue
        const mid = s.moment_id as string
        shareCountMap[mid] = (shareCountMap[mid] || 0) + 1
        if (!sharersMap[mid]) sharersMap[mid] = []
        if (sharersMap[mid].length < 10 && s.user_id && userMap[s.user_id]) {
          sharersMap[mid].push(userMap[s.user_id])
        }
      }
    }

    const result = moments.map((m) => ({
      ...m,
      share_count: shareCountMap[m.id as string] || 0,
      sharers: sharersMap[m.id as string] || [],
    }))
    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/moments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isAdmin = user.role === 'admin' || user.role === 'manager'
      || session.user.email === 'phil@intercom.io'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { title, summary, parsed_content, doc_url, platform_targets } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data: moment, error } = await supabase
      .from('sharing_moments')
      .insert({
        title,
        summary: summary || null,
        parsed_content: parsed_content || null,
        doc_url: doc_url || null,
        platform_targets: platform_targets || ['linkedin', 'x'],
        created_by: user.id,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(moment)
  } catch (err) {
    console.error('POST /api/moments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
