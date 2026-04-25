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

  // Get all dismissed + shared moment IDs for this user (same approach as /api/moments)
  const [{ data: dismissed }, { data: userShares }] = await Promise.all([
    supabase.from('dismissed_moments').select('moment_id').eq('user_id', user.id),
    supabase.from('shares').select('moment_id').eq('user_id', user.id).not('moment_id', 'is', null),
  ])

  const excludedIds = Array.from(new Set([
    ...(dismissed || []).map((d) => d.moment_id as string).filter(Boolean),
    ...(userShares || []).map((s) => s.moment_id as string).filter(Boolean),
  ]))

  // Fetch active non-expired moments, excluding dismissed/shared — identical to web app active view
  let query = supabase
    .from('sharing_moments')
    .select('*')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`)
  }

  const { data: moments, error } = await query
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  if (!moments || moments.length === 0) return NextResponse.json([])

  const ids = moments.map((m) => m.id)

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

  const result = moments.map((m) => ({
    ...m,
    share_count: shareCountMap[m.id] || 0,
    sharers: (sharersMap[m.id] || []).map((uid) => sharerUserMap[uid]).filter(Boolean),
  }))

  return NextResponse.json(result)
}
