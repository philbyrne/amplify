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

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (err) {
    console.error('GET /api/profile error:', err)
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
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { linkedin_url, name, x_handle, instagram_handle, onboarding_completed } = body

    const updates: Record<string, string | boolean | null> = {}
    if (linkedin_url !== undefined) updates.linkedin_url = linkedin_url
    if (name !== undefined) updates.name = name
    if (x_handle !== undefined) updates.x_handle = x_handle
    if (instagram_handle !== undefined) updates.instagram_handle = instagram_handle
    if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed
    if (body.voice_profile !== undefined) updates.voice_profile = body.voice_profile

    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
