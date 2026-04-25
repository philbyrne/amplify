export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

interface SessionUser {
  role?: string
  email?: string | null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as SessionUser | undefined
    const isManager =
      user?.role === 'manager' ||
      user?.role === 'admin' ||
      user?.email === 'phil@intercom.io'

    if (!session || !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from('dismissed_moments')
      .select(`
        moment_id,
        dismissed_at,
        users ( name, avatar_url, email ),
        sharing_moments ( title )
      `)
      .order('dismissed_at', { ascending: false })

    if (error) {
      console.error('GET /api/analytics/dismissals error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('GET /api/analytics/dismissals error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
