export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
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
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    const isAdmin = user?.role === 'admin' || user?.role === 'manager'
      || session.user.email === 'phil@intercom.io'
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: moments, error } = await supabase
      .from('sharing_moments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(moments || [])
  } catch (err) {
    console.error('GET /api/moments/all error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
