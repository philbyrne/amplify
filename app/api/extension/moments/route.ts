export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyExtensionToken } from '@/lib/extension-token'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  // Verify Bearer token
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = verifyExtensionToken(token)
  if (!email) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })

  const supabase = getAdminClient()

  // Resolve user ID from email
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch active, non-expired moments
  const { data: moments, error } = await supabase
    .from('sharing_moments')
    .select('*')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  const ids = (moments || []).map((m) => m.id)
  if (ids.length === 0) return NextResponse.json([])

  // Find which moments this user has already shared or dismissed
  // Note: no .in() filter — fetch all for this user then intersect in JS,
  // matching the same approach used by /api/moments to avoid subtle mismatches
  const [sharesResult, dismissedResult] = await Promise.all([
    supabase
      .from('shares')
      .select('moment_id')
      .eq('user_id', user.id)
      .not('moment_id', 'is', null),
    supabase
      .from('dismissed_moments')
      .select('moment_id')
      .eq('user_id', user.id),
  ])

  if (sharesResult.error) console.error('[extension/moments] shares query error:', sharesResult.error)
  if (dismissedResult.error) console.error('[extension/moments] dismissed query error:', dismissedResult.error)

  console.log('[extension/moments] user:', user.id,
    'active ids:', ids,
    'dismissed ids:', (dismissedResult.data || []).map(d => d.moment_id),
    'share moment ids:', (sharesResult.data || []).map(s => s.moment_id),
  )

  const excludedIds = new Set([
    ...(sharesResult.data || []).map((s) => s.moment_id),
    ...(dismissedResult.data || []).map((d) => d.moment_id),
  ])

  // Attach total share counts + sharer avatars
  const { data: allShares } = await supabase
    .from('shares')
    .select('moment_id, user_id')
    .in('moment_id', ids)

  const shareCountMap: Record<string, number> = {}
  const sharersMap: Record<string, string[]> = {}
  for (const s of allShares || []) {
    if (!s.moment_id) continue
    shareCountMap[s.moment_id] = (shareCountMap[s.moment_id] || 0) + 1
    if (!sharersMap[s.moment_id]) sharersMap[s.moment_id] = []
    if (sharersMap[s.moment_id].length < 10 && s.user_id) sharersMap[s.moment_id].push(s.user_id)
  }

  const allSharerUserIds = Array.from(new Set(Object.values(sharersMap).flat()))
  let sharerUserMap: Record<string, { name: string | null; avatar_url: string | null }> = {}
  if (allSharerUserIds.length > 0) {
    const { data: sharerUsers } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .in('id', allSharerUserIds)
    for (const u of sharerUsers || []) sharerUserMap[u.id] = { name: u.name, avatar_url: u.avatar_url }
  }

  // Exclude moments the user has already shared or dismissed
  const result = (moments || [])
    .filter((m) => !excludedIds.has(m.id))
    .map((m) => ({
      ...m,
      share_count: shareCountMap[m.id] || 0,
      sharers: (sharersMap[m.id] || []).map((uid) => sharerUserMap[uid]).filter(Boolean),
    }))

  return NextResponse.json(result)
}
