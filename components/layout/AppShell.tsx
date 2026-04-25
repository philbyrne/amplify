'use client'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Zap, Rss, Trophy, User, Users, BarChart3, LogOut,
  ChevronRight, PanelLeftClose, PanelLeftOpen, Loader2, Shield, X
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

let confettiFn: ((opts: object) => void) | null = null
if (typeof window !== 'undefined') {
  import('canvas-confetti').then((m) => { confettiFn = m.default })
}

const navItems = [
  { href: '/feed', label: 'Feed', icon: Rss },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'My Profile', icon: User },
]

const adminItems = [
  { href: '/admin/moments', label: 'Moments', icon: Zap },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const isAdmin = (session?.user as any)?.role === 'admin'
    || session?.user?.email === 'phil@intercom.io'
  const isManager = (session?.user as any)?.role === 'manager' || isAdmin
  const points = (session?.user as any)?.points || 0
  const [showAdminWelcome, setShowAdminWelcome] = useState(false)
  const [adminPulse, setAdminPulse] = useState(false)
  const [momentCount, setMomentCount] = useState(0)

  function fetchMomentCount() {
    fetch('/api/moments')
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => {
        const moments = Array.isArray(data) ? data : []
        setMomentCount(moments.length)
        checkAndNotify(moments)
      })
      .catch(() => {})
  }

  useEffect(() => {
    // Auto-request notification permission on first visit (default-on)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    fetchMomentCount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Re-fetch badge count whenever a moment is shared or dismissed in the feed
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'AMPLIFY_SHARED') fetchMomentCount()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function checkAndNotify(moments: Record<string, unknown>[]) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const seenIds: string[] = JSON.parse(localStorage.getItem('amplify-seen-moment-ids') || '[]')
    const newMoments = moments.filter((m) => !seenIds.includes(m.id as string))

    // Always update seen IDs so we don't re-notify after enabling notifications later
    if (moments.length > 0) {
      const allIds = Array.from(new Set([...seenIds, ...moments.map((m) => m.id as string)]))
      localStorage.setItem('amplify-seen-moment-ids', JSON.stringify(allIds))
    }

    if (
      newMoments.length === 0 ||
      localStorage.getItem('amplify-notifications-enabled') === '0' ||
      Notification.permission !== 'granted'
    ) return

    for (const m of newMoments) {
      const priority = (m.parsed_content as Record<string, unknown> | null)?.priority ?? 1
      const n = new Notification(
        priority === 3 ? '🔥 High-Priority Sharing Moment!' : priority === 2 ? '⚡ New Sharing Moment' : '💡 New Sharing Moment',
        { body: m.title as string, icon: '/amplify-icon.png', tag: m.id as string }
      )
      n.onclick = () => { window.focus(); window.location.href = `/feed?moment=${m.id}` }
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('amplify-sidebar-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])

  // Show admin welcome popup once per device per email
  useEffect(() => {
    if (!isAdmin || !session?.user?.email) return
    const key = `amplify-admin-welcomed-${session.user.email}`
    if (!localStorage.getItem(key)) {
      setShowAdminWelcome(true)
    }
  }, [isAdmin, session?.user?.email])

  function dismissAdminWelcome() {
    if (session?.user?.email) {
      localStorage.setItem(`amplify-admin-welcomed-${session.user.email}`, '1')
    }
    setShowAdminWelcome(false)
    // Pulse the admin section for 4 seconds after dismissing
    setAdminPulse(true)
    setTimeout(() => setAdminPulse(false), 4000)
    if (confettiFn) confettiFn({ particleCount: 100, spread: 70, origin: { y: 0.4 }, colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#f59e0b', '#ffffff'] })
  }

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('amplify-sidebar-collapsed', next ? '1' : '0')
  }

  const initials = (session?.user?.name ?? session?.user?.email ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-sidebar-border shrink-0',
        collapsed ? 'justify-center px-2' : 'gap-2 px-4'
      )}>
        {collapsed ? (
          <button onClick={toggleCollapsed} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Expand">
            <PanelLeftOpen size={16} />
          </button>
        ) : (
          <>
            <button onClick={toggleCollapsed} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors -ml-1" title="Collapse">
              <PanelLeftClose size={16} />
            </button>
            <span className="text-lg font-heading font-light tracking-tight text-foreground">Amplify</span>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          const badge = href === '/feed' && momentCount > 0 ? momentCount : null
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined}>
              <div className={cn(
                'flex items-center gap-3 rounded-lg text-sm transition-colors group',
                collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                active
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}>
                <div className="relative shrink-0">
                  <Icon size={15} className={cn('transition-colors', active ? 'text-primary' : 'group-hover:text-foreground')} />
                  {badge && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                {!collapsed && label}
                {!collapsed && badge && (
                  <span className="ml-auto flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                    {badge}
                  </span>
                )}
                {!collapsed && !badge && active && <ChevronRight size={13} className="ml-auto text-primary opacity-60" />}
              </div>
            </Link>
          )
        })}

        {isManager && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-1 px-3">
                <p className={cn(
                  'text-[10px] font-semibold uppercase tracking-widest font-mono-caps transition-colors',
                  adminPulse ? 'text-primary animate-pulse' : 'text-muted-foreground'
                )}>Admin</p>
              </div>
            )}
            {collapsed && <div className="my-2 border-t border-sidebar-border" />}
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href} title={collapsed ? label : undefined}>
                  <div className={cn(
                    'flex items-center gap-3 rounded-lg text-sm transition-colors group',
                    collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                    active
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}>
                    <Icon size={15} className={cn('shrink-0', active ? 'text-primary' : 'group-hover:text-foreground')} />
                    {!collapsed && label}
                    {!collapsed && active && <ChevronRight size={13} className="ml-auto text-primary opacity-60" />}
                  </div>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className={cn('flex items-center gap-3 rounded-lg', collapsed ? 'justify-center py-2' : 'px-2 py-2')}>
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="h-7 w-7 rounded-full shrink-0 ring-1 ring-border" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
              {initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{session?.user?.name}</p>
                <p className="text-[10px] text-primary font-semibold font-mono-caps">{points} pts</p>
              </div>
              <button
                onClick={() => { setSigningOut(true); signOut({ callbackUrl: '/login' }) }}
                disabled={signingOut}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                title="Sign out"
              >
                {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
    {/* Admin welcome modal */}
    <AnimatePresence>
      {showAdminWelcome && (
        <motion.div
          key="admin-welcome"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative bg-card border border-border rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-light text-foreground mb-2">You&apos;re an Admin</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              You now have access to the admin panel. You can manage content packages, create sharing moments, and manage team members.
            </p>
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 mb-6 text-left">
              <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary">Admin panel unlocked</p>
                <p className="text-[11px] text-muted-foreground">Check the sidebar — it&apos;s all yours.</p>
              </div>
            </div>
            <button
              onClick={dismissAdminWelcome}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Let&apos;s go! 🚀
            </button>
            <button onClick={dismissAdminWelcome} className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="flex h-screen bg-background overflow-hidden">
      <aside className={cn(
        'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}>
        {sidebarContent}
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
    </>
  )
}
