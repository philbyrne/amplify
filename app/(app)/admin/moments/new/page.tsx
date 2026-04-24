'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MomentForm from '@/components/admin/MomentForm'

interface SessionUser { role?: string; email?: string | null }

export default function NewMomentPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as SessionUser | undefined
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'
    || user?.email === 'phil@intercom.io'

  useEffect(() => {
    if (session && !isAdmin) router.push('/feed')
  }, [session, isAdmin, router])

  return (
    <div>
      <div className="bg-background border-b border-border px-8 py-6">
        <Link href="/admin/moments" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Moments
        </Link>
        <h1 className="font-heading text-3xl font-light text-foreground">New Sharing Moment</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Parse a Google Doc to create a sharing opportunity for the team
        </p>
      </div>
      <div className="px-8 py-6">
        <MomentForm />
      </div>
    </div>
  )
}
