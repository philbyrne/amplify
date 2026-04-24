export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import type { LeaderboardEntry } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'all'
    const limit = 20

    const supabase = getAdminClient()

    if (period === 'monthly') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyCounts, error: countError } = await supabase
        .from('shares')
        .select('user_id')
        .gte('shared_at', startOfMonth.toISOString())

      if (countError) throw countError

      const userShareCounts: Record<string, number> = {}
      for (const share of monthlyCounts || []) {
        userShareCounts[share.user_id] =
          (userShareCounts[share.user_id] || 0) + 1
      }

      const userIds = Object.keys(userShareCounts)
      if (userIds.length === 0) {
        return NextResponse.json([])
      }

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, avatar_url, points')
        .in('id', userIds)

      if (userError) throw userError

      const entries: LeaderboardEntry[] = (users || [])
        .map((u) => ({
          userId: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          points: (userShareCounts[u.id] || 0) * 10,
          shareCount: userShareCounts[u.id] || 0,
          rank: 0,
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, limit)
        .map((e, i) => ({ ...e, rank: i + 1 }))

      return NextResponse.json(entries)
    }

    // All-time
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, avatar_url, points')
      .gt('points', 0)
      .order('points', { ascending: false })
      .limit(limit)

    if (userError) throw userError

    const userIds = (users || []).map((u) => u.id)
    const { data: shareCounts } = await supabase
      .from('shares')
      .select('user_id')
      .in('user_id', userIds)

    const countMap: Record<string, number> = {}
    for (const s of shareCounts || []) {
      countMap[s.user_id] = (countMap[s.user_id] || 0) + 1
    }

    const entries: LeaderboardEntry[] = (users || []).map((u, i) => ({
      userId: u.id,
      name: u.name,
      avatar_url: u.avatar_url,
      points: u.points,
      shareCount: countMap[u.id] || 0,
      rank: i + 1,
    }))

    return NextResponse.json(entries)
  } catch (err) {
    console.error('GET /api/leaderboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
