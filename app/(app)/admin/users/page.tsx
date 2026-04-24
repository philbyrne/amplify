'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Users, Crown, Shield, UserPlus, X, Share2, Clock, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SessionUser { role?: string; email?: string | null }

interface UserRow {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: 'employee' | 'manager' | 'admin'
  points: number
  linkedin_url: string | null
  created_at: string
  updated_at: string
  share_count: number
}

function Avatar({ user, size = 8 }: { user: UserRow; size?: number }) {
  const initials = (user.name || user.email)
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return user.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar_url} alt="" className={`h-${size} w-${size} rounded-full shrink-0 ring-1 ring-border object-cover`} />
  ) : (
    <div className={`h-${size} w-${size} rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

function UserListRow({ user, badge, showShares = false }: { user: UserRow; badge?: string; showShares?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-secondary/50 transition-colors rounded-xl">
      <Avatar user={user} size={9} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{user.name || user.email.split('@')[0]}</p>
          {badge && (
            <span className={`text-[10px] font-mono-caps px-2 py-0.5 rounded-full border shrink-0 ${
              badge === 'Owner'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-primary/10 text-primary border-primary/30'
            }`}>{badge}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      {showShares && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Share2 className="h-3 w-3" />
          {user.share_count}
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addAdminOpen, setAddAdminOpen] = useState(false)
  const [addAdminEmail, setAddAdminEmail] = useState('')
  const [addAdminLoading, setAddAdminLoading] = useState(false)
  const [addAdminError, setAddAdminError] = useState('')
  const [addAdminSuccess, setAddAdminSuccess] = useState('')
  const [showAllOpen, setShowAllOpen] = useState(false)

  const sessionUser = session?.user as SessionUser | undefined
  const isAdmin = sessionUser?.role === 'manager' || sessionUser?.role === 'admin'
    || sessionUser?.email === 'phil@intercom.io'

  useEffect(() => {
    if (session && !isAdmin) router.push('/feed')
  }, [session, isAdmin, router])

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const currentUserEmail = sessionUser?.email || ''

  // Partition users
  const ownerUser = users.find((u) => u.email === currentUserEmail) || null
  const admins = users.filter((u) =>
    (u.role === 'admin' || u.role === 'manager') && u.email !== currentUserEmail
  )
  // Recent team members: all employees ordered by updated_at (proxy for last login), exclude admins
  const teamMembers = users
    .filter((u) => u.role === 'employee')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    setAddAdminLoading(true)
    setAddAdminError('')
    setAddAdminSuccess('')
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addAdminEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddAdminError(data.error || 'Failed to add admin')
        return
      }
      setAddAdminSuccess(
        data.existed
          ? `${addAdminEmail} has been promoted to admin. They'll see a welcome message next time they visit.`
          : `Invite created for ${addAdminEmail}. When they first log in they'll have admin access.`
      )
      setAddAdminEmail('')
      // Refresh users list
      fetch('/api/users')
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setUsers(d) })
    } catch {
      setAddAdminError('Something went wrong. Please try again.')
    } finally {
      setAddAdminLoading(false)
    }
  }

  return (
    <>
      {/* Add Admin Modal */}
      <AnimatePresence>
        {addAdminOpen && (
          <motion.div
            key="add-admin-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setAddAdminOpen(false); setAddAdminError(''); setAddAdminSuccess('') }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 rounded-lg p-1.5">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="font-semibold text-foreground">Add Admin</h2>
                </div>
                <button
                  onClick={() => { setAddAdminOpen(false); setAddAdminError(''); setAddAdminSuccess('') }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {addAdminSuccess ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400 mb-4">
                  {addAdminSuccess}
                </div>
              ) : (
                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Email address</label>
                    <input
                      type="email"
                      value={addAdminEmail}
                      onChange={(e) => setAddAdminEmail(e.target.value)}
                      placeholder="colleague@intercom.io"
                      className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">Must be an @intercom.io address</p>
                  </div>
                  {addAdminError && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{addAdminError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setAddAdminOpen(false); setAddAdminError('') }}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addAdminLoading || !addAdminEmail.trim()}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {addAdminLoading ? 'Adding…' : 'Add as Admin'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View All Modal */}
      <AnimatePresence>
        {showAllOpen && (
          <motion.div
            key="view-all-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAllOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <h2 className="font-semibold text-foreground">All Team Members <span className="text-muted-foreground font-normal text-sm">({teamMembers.length})</span></h2>
                <button onClick={() => setShowAllOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {teamMembers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-2.5 px-3 hover:bg-secondary/50 rounded-xl transition-colors">
                    <Avatar user={u} size={8} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{u.name || u.email.split('@')[0]}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {u.share_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {/* Header */}
        <div className="bg-background border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-light text-foreground">Users</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Manage team access and view advocacy activity</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary border border-border rounded-xl px-3 py-2">
              <Users className="h-4 w-4" />
              {users.length} members
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-8 py-6 space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />)}
          </div>
        ) : (
          <div className="px-8 py-6 space-y-6">

            {/* Owner */}
            {ownerUser && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <h2 className="text-sm font-semibold text-foreground">Owner</h2>
                </div>
                <div className="p-2">
                  <UserListRow user={ownerUser} badge="Owner" showShares />
                </div>
              </div>
            )}

            {/* Admins */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Admins</h2>
                  {admins.length > 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono-caps">{admins.length}</span>
                  )}
                </div>
                <button
                  onClick={() => { setAddAdminOpen(true); setAddAdminSuccess('') }}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Admin
                </button>
              </div>
              <div className="p-2">
                {admins.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 px-3 italic">No other admins yet. Add one above.</p>
                ) : (
                  admins.map((u) => <UserListRow key={u.id} user={u} badge="Admin" showShares />)
                )}
              </div>
            </div>

            {/* Recent team members */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
                  {teamMembers.length > 0 && (
                    <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border">{teamMembers.length}</span>
                  )}
                </div>
                {teamMembers.length > 10 && (
                  <button
                    onClick={() => setShowAllOpen(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all <ChevronDown className="h-3 w-3" />
                  </button>
                )}
              </div>

              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 px-5 italic">No team members have logged in yet.</p>
              ) : (
                <>
                  <div className="px-4 py-2 bg-secondary/40 border-b border-border grid grid-cols-[1fr_auto_auto] gap-4 text-[10px] font-mono-caps text-muted-foreground uppercase tracking-wide">
                    <span>Member</span>
                    <span>Posts</span>
                    <span>Last seen</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {teamMembers.slice(0, 10).map((u) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 py-3 px-4 hover:bg-secondary/50 transition-colors"
                      >
                        <Avatar user={u} size={8} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{u.name || u.email.split('@')[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-12 justify-center">
                          <Share2 className="h-3 w-3" />
                          {u.share_count}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 w-28 justify-end">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatDistanceToNow(new Date(u.updated_at), { addSuffix: true })}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {teamMembers.length > 10 && (
                    <div className="px-5 py-3 border-t border-border">
                      <button
                        onClick={() => setShowAllOpen(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        View all {teamMembers.length} members →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  )
}
