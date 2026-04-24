export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { notifyNewPackage } from '@/lib/slack'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    // Get the user's role
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    const isManager =
      currentUser?.role === 'manager' || currentUser?.role === 'admin'

    let query = supabase
      .from('packages')
      .select(`*, shares(count)`)
      .order('created_at', { ascending: false })

    if (!isManager) {
      query = query.eq('is_active', true)
    }

    const { data: packages, error } = await query

    if (error) throw error

    const result = (packages || []).map((p) => ({
      ...p,
      share_count: Array.isArray(p.shares) ? p.shares[0]?.count || 0 : 0,
      shares: undefined,
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/packages error:', err)
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

    const { data: currentUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', session.user.email)
      .single()

    if (!currentUser || !['manager', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      description,
      body: packageBody,
      platform_targets,
      drive_folder_url,
      has_no_files,
      example_copies,
      tags,
      cover_image_url,
      is_active,
    } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data: newPackage, error } = await supabase
      .from('packages')
      .insert({
        title: title.trim(),
        description: description || null,
        body: packageBody || null,
        platform_targets: platform_targets || ['linkedin', 'x'],
        drive_folder_url: drive_folder_url || null,
        has_no_files: has_no_files || false,
        example_copies: example_copies || [],
        tags: tags || [],
        cover_image_url: cover_image_url || null,
        is_active: is_active !== undefined ? is_active : true,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) throw error

    notifyNewPackage({
      id: newPackage.id,
      title: newPackage.title,
      description: newPackage.description,
    }).catch(console.error)

    return NextResponse.json(newPackage, { status: 201 })
  } catch (err) {
    console.error('POST /api/packages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
