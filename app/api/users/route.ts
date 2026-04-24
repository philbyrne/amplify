export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    const isOwnerEmail = session.user.email === 'phil@intercom.io'
    if (!currentUser || (!['manager', 'admin'].includes(currentUser.role) && !isOwnerEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, role, points, linkedin_url, created_at, updated_at')
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Attach share counts
    const { data: allShares } = await supabase.from('shares').select('user_id')
    const shareCountByUser: Record<string, number> = {}
    for (const s of allShares || []) {
      if (s.user_id) shareCountByUser[s.user_id] = (shareCountByUser[s.user_id] || 0) + 1
    }

    const result = (users || []).map((u) => ({ ...u, share_count: shareCountByUser[u.id] || 0 }))
    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/users error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    const isOwnerEmail = session.user.email === 'phil@intercom.io'
    if (!currentUser || (currentUser.role !== 'admin' && !isOwnerEmail)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const body = await req.json()

    // Email-based admin invite (upsert)
    if (body.email && !body.userId) {
      const { email } = body
      if (!email.endsWith('@intercom.io')) {
        return NextResponse.json({ error: 'Must be an @intercom.io email address' }, { status: 400 })
      }
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existing) {
        await supabase.from('users').update({ role: 'admin' }).eq('id', existing.id)
        return NextResponse.json({ success: true, existed: true })
      } else {
        await supabase.from('users').insert({
          id: crypto.randomUUID(),
          email,
          name: email.split('@')[0],
          avatar_url: null,
          role: 'admin',
          points: 0,
        })
        return NextResponse.json({ success: true, existed: false })
      }
    }

    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    if (!['employee', 'manager', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/users error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
