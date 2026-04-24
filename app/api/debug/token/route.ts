export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.email !== 'phil@intercom.io') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const token = (session as unknown as Record<string, unknown>).access_token
  return NextResponse.json({
    hasToken: !!token,
    tokenPrefix: token ? String(token).slice(0, 20) + '...' : null,
  })
}
