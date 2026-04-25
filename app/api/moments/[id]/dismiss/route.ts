export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    console.log('[dismiss] session email:', session.user.email, 'resolved user_id:', user.id, 'moment_id:', params.id)

    const { error: upsertError } = await supabase
      .from('dismissed_moments')
      .upsert(
        { user_id: user.id, moment_id: params.id },
        { onConflict: 'user_id,moment_id', ignoreDuplicates: true }
      )

    if (upsertError) {
      console.error('Dismiss upsert error:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/moments/[id]/dismiss error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
