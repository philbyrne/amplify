'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Package, Share2, Users, TrendingUp, Edit, Eye, EyeOff, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Package as PackageType } from '@/lib/types'

interface SessionUser {
  role?: string
}

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [packages, setPackages] = useState<PackageType[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const user = session?.user as SessionUser | undefined
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  useEffect(() => {
    if (session && !isManager) {
      router.push('/feed')
    }
  }, [session, isManager, router])

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.json())
      .then((data) => {
        setPackages(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function toggleActive(pkg: PackageType) {
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !pkg.is_active }),
    })
    if (res.ok) {
      setPackages((prev) =>
        prev.map((p) =>
          p.id === pkg.id ? { ...p, is_active: !p.is_active } : p
        )
      )
    }
  }

  async function deletePackage(id: string) {
    if (!confirm('Archive this package? It will be hidden from employees.')) return
    setDeletingId(id)
    const res = await fetch(`/api/packages/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPackages((prev) => prev.filter((p) => p.id !== id))
    }
    setDeletingId(null)
  }

  const activeCount = packages.filter((p) => p.is_active).length
  const totalShares = packages.reduce((sum, p) => sum + (p.share_count || 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="bg-background border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-light text-foreground">Content Packages</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage the content your employees can share
            </p>
          </div>
          <Link href="/admin/packages/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Package
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Active Packages',
              value: activeCount,
              icon: Package,
              color: 'text-primary bg-primary/10',
            },
            {
              label: 'Total Shares',
              value: totalShares,
              icon: Share2,
              color: 'text-green-400 bg-green-500/10',
            },
            {
              label: 'Avg Shares/Package',
              value: packages.length
                ? Math.round(totalShares / packages.length)
                : 0,
              icon: TrendingUp,
              color: 'text-amber-400 bg-amber-500/10',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-2xl border border-border p-5"
            >
              <div className={`inline-flex p-2 rounded-xl ${stat.color} mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Packages table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">All Packages</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-primary/30" />
              <p className="text-muted-foreground font-medium">No packages yet</p>
              <Link href="/admin/packages/new">
                <button className="mt-3 text-primary text-sm font-medium hover:underline">
                  Create your first package →
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {packages.map((pkg, idx) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">
                        {pkg.title}
                      </p>
                      {!pkg.is_active && (
                        <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full shrink-0 border border-border">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {pkg.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full font-mono-caps"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        Created{' '}
                        {formatDistanceToNow(new Date(pkg.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <Share2 className="h-3.5 w-3.5" />
                    {pkg.share_count || 0} shares
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/packages/${pkg.id}/edit`}>
                      <button
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => toggleActive(pkg)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title={pkg.is_active ? 'Archive' : 'Restore'}
                    >
                      {pkg.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deletePackage(pkg.id)}
                      disabled={deletingId === pkg.id}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
