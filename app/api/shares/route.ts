export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { generateUtmCode, buildShareUrl } from '@/lib/utm'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, points')
      .eq('email', session.user.email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { packageId, momentId, platform, copyUsed } = body

    if ((!packageId && !momentId) || !platform) {
      return NextResponse.json(
        { error: 'packageId or momentId, and platform are required' },
        { status: 400 }
      )
    }

    if (!['linkedin', 'x'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be linkedin or x' },
        { status: 400 }
      )
    }

    const { data: configRow } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'points_per_share')
      .single()

    const pointsPerShare = configRow ? parseInt(configRow.value, 10) || 10 : 10

    const utmCode = generateUtmCode(user.id, packageId || momentId, platform)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.intercom.com'
    const shareUrl = buildShareUrl(appUrl, utmCode)

    const { data: share, error: shareError } = await supabase
      .from('shares')
      .insert({
        user_id: user.id,
        package_id: packageId || null,
        moment_id: momentId || null,
        platform,
        copy_used: copyUsed || null,
        utm_code: utmCode,
      })
      .select()
      .single()

    if (shareError) {
      console.error('Share insert error:', shareError)
    }

    const { error: pointsError } = await supabase
      .from('users')
      .update({ points: (user.points || 0) + pointsPerShare })
      .eq('id', user.id)

    if (pointsError) {
      console.error('Points update error:', pointsError)
    }

    return NextResponse.json({
      success: true,
      shareUrl,
      utmCode,
      pointsEarned: pointsPerShare,
      shareId: share?.id,
    })
  } catch (err) {
    console.error('POST /api/shares error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
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

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50

    const isAdmin =
      currentUser.role === 'admin' || currentUser.role === 'manager'

    let query = supabase
      .from('shares')
      .select(`*, packages(title), sharing_moments(title), users(name, avatar_url)`)
      .order('shared_at', { ascending: false })
      .limit(limit)

    if (!isAdmin) {
      query = query.eq('user_id', currentUser.id)
    }

    const { data: shares, error } = await query

    if (error) throw error

    return NextResponse.json(shares || [])
  } catch (err) {
    console.error('GET /api/shares error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
