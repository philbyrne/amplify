'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MomentForm from '@/components/admin/MomentForm'
import type { SharingMoment } from '@/lib/types'

interface SessionUser { role?: string; email?: string | null }

export default function EditMomentPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [moment, setMoment] = useState<SharingMoment | null>(null)
  const [loading, setLoading] = useState(true)

  const user = session?.user as SessionUser | undefined
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.email === 'phil@intercom.io'

  useEffect(() => {
    if (session && !isAdmin) router.push('/feed')
  }, [session, isAdmin, router])

  useEffect(() => {
    if (!id) return
    fetch(`/api/moments/${id}`)
      .then((r) => r.json())
      .then((data) => { setMoment(data); setLoading(false) })
      .catch(() => { router.push('/admin/moments') })
  }, [id, router])

  return (
    <div>
      <div className="bg-background border-b border-border px-8 py-6">
        <Link href="/admin/moments" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Moments
        </Link>
        <h1 className="font-heading text-3xl font-light text-foreground">Edit Sharing Moment</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? 'Loading…' : moment?.title}
        </p>
      </div>
      <div className="px-8 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />)}
          </div>
        ) : moment ? (
          <MomentForm moment={moment} />
        ) : null}
      </div>
    </div>
  )
}
