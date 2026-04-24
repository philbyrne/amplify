'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Zap, EyeOff, Eye, Trash2, ExternalLink, Clock, Edit } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import type { SharingMoment } from '@/lib/types'

interface SessionUser { role?: string; email?: string | null }

export default function MomentsAdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [moments, setMoments] = useState<SharingMoment[]>([])
  const [loading, setLoading] = useState(true)

  const user = session?.user as SessionUser | undefined
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'
    || user?.email === 'phil@intercom.io'

  useEffect(() => {
    if (session && !isAdmin) router.push('/feed')
  }, [session, isAdmin, router])

  useEffect(() => {
    fetch('/api/moments/all')
      .then((r) => r.json())
      .then((data) => {
        setMoments(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function toggleActive(m: SharingMoment) {
    const res = await fetch(`/api/moments/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    if (res.ok) {
      setMoments((prev) => prev.map((x) => x.id === m.id ? { ...x, is_active: !m.is_active } : x))
    }
  }

  async function deleteMoment(id: string) {
    if (!confirm('Delete this sharing moment? This cannot be undone.')) return
    const res = await fetch(`/api/moments/${id}`, { method: 'DELETE' })
    if (res.ok) setMoments((prev) => prev.filter((x) => x.id !== id))
  }

  const activeCount = moments.filter((m) => m.is_active && new Date(m.expires_at) > new Date()).length

  return (
    <div>
      <div className="bg-background border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-light text-foreground">Sharing Moments</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Time-limited sharing opportunities for the team
            </p>
          </div>
          <Link href="/admin/moments/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Moment
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Moments', value: activeCount, icon: Zap, color: 'text-primary bg-primary/10' },
            { label: 'Total Created', value: moments.length, icon: Clock, color: 'text-blue-400 bg-blue-500/10' },
            { label: 'Expired', value: moments.filter((m) => new Date(m.expires_at) <= new Date()).length, icon: Clock, color: 'text-muted-foreground bg-secondary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border p-5">
              <div className={`inline-flex p-2 rounded-xl ${stat.color} mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">All Moments</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}
            </div>
          ) : moments.length === 0 ? (
            <div className="py-16 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-primary/30" />
              <p className="text-muted-foreground font-medium">No moments yet</p>
              <Link href="/admin/moments/new">
                <button className="mt-3 text-primary text-sm font-medium hover:underline">
                  Create your first sharing moment →
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {moments.map((m, idx) => {
                const expired = new Date(m.expires_at) <= new Date()
                const daysLeft = differenceInDays(new Date(m.expires_at), new Date())
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/moments/${m.id}/edit`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{m.title}</p>
                        {expired && (
                          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full shrink-0 border border-border">Expired</span>
                        )}
                        {!m.is_active && !expired && (
                          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full shrink-0 border border-border">Hidden</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </span>
                        {!expired && (
                          <span className={`text-xs font-mono-caps ${daysLeft <= 2 ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {daysLeft}d left
                          </span>
                        )}
                      </div>
                    </div>

                    <Link href={`/admin/moments/${m.id}/edit`} onClick={(e) => e.stopPropagation()}>
                      <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                    </Link>
                    {m.doc_url && (
                      <a href={m.doc_url} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Open doc">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(m) }}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title={m.is_active ? 'Hide from feed' : 'Show in feed'}
                    >
                      {m.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMoment(m.id) }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
