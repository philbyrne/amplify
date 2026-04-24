export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

async function requireAdmin(email: string) {
  const supabase = getAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('email', email)
    .single()
  return user?.role === 'admin' || user?.role === 'manager' || email === 'phil@intercom.io'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('sharing_moments')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('GET /api/moments/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await requireAdmin(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('sharing_moments')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/moments/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await requireAdmin(session.user.email))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = getAdminClient()

    // Remove child rows that reference this moment before deleting
    await supabase.from('dismissed_moments').delete().eq('moment_id', params.id)
    await supabase.from('shares').update({ moment_id: null }).eq('moment_id', params.id)

    const { error } = await supabase.from('sharing_moments').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/moments/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
