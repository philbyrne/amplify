'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PackageForm from '@/components/admin/PackageForm'
import type { Package } from '@/lib/types'

interface SessionUser {
  role?: string
}

export default function EditPackagePage({
  params,
}: {
  params: { id: string }
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const user = session?.user as SessionUser | undefined

  useEffect(() => {
    if (session && user?.role === 'employee') {
      router.push('/feed')
    }
  }, [session, user, router])

  useEffect(() => {
    fetch(`/api/packages/${params.id}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true)
          setLoading(false)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (data) setPkg(data)
        setLoading(false)
      })
      .catch(() => {
        setNotFound(true)
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="px-8 py-6">
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl h-32 animate-pulse border border-border" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="px-8 py-20 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">Package not found</p>
        <button
          onClick={() => router.push('/admin')}
          className="mt-3 text-primary text-sm font-medium hover:underline"
        >
          ← Back to packages
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-background border-b border-border px-8 py-6">
        <h1 className="font-heading text-3xl font-light text-foreground">Edit Package</h1>
        <p className="text-muted-foreground text-sm mt-0.5 truncate max-w-xl">
          {pkg?.title}
        </p>
      </div>
      <div className="px-8 py-6">
        {pkg && <PackageForm existingPackage={pkg} />}
      </div>
    </div>
  )
}
