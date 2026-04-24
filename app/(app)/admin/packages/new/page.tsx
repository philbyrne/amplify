'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import PackageForm from '@/components/admin/PackageForm'

interface SessionUser {
  role?: string
}

export default function NewPackagePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as SessionUser | undefined

  useEffect(() => {
    if (session && user?.role === 'employee') {
      router.push('/feed')
    }
  }, [session, user, router])

  return (
    <div>
      <div className="bg-background border-b border-border px-8 py-6">
        <h1 className="font-heading text-3xl font-light text-foreground">New Content Package</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Create a new package for employees to share
        </p>
      </div>
      <div className="px-8 py-6">
        <PackageForm />
      </div>
    </div>
  )
}
