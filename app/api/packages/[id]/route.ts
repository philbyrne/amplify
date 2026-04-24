import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

async function getManagerUser(email: string) {
  const { data } = await getAdminClient()
    .from('users')
    .select('id, role')
    .eq('email', email)
    .single()
  return data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const { data: pkg, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const user = await getManagerUser(session.user.email)
    const isManager = user?.role === 'manager' || user?.role === 'admin'

    if (!pkg.is_active && !isManager) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    return NextResponse.json(pkg)
  } catch (err) {
    console.error('GET /api/packages/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getManagerUser(session.user.email)
    if (!user || !['manager', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const allowedFields = [
      'title', 'description', 'body', 'platform_targets',
      'drive_folder_url', 'has_no_files', 'example_copies',
      'tags', 'cover_image_url', 'is_active',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    const { data: updated, error } = await getAdminClient()
      .from('packages')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/packages/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getManagerUser(session.user.email)
    if (!user || !['manager', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await getAdminClient()
      .from('packages')
      .update({ is_active: false })
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/packages/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
