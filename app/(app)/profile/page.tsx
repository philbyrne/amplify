'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import VoiceSetup from '@/components/profile/VoiceSetup'
import { formatDistanceToNow } from 'date-fns'
import {
  User,
  Zap,
  Share2,
  Linkedin,
  Twitter,
  Trophy,
  Calendar,
  Bell,
  BellOff,
  BellRing,
} from 'lucide-react'
import type { User as UserType, Share } from '@/lib/types'

interface SessionUser {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
  points?: number
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserType | null>(null)
  const [shares, setShares] = useState<(Share & { packages?: { title: string } })[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingShares, setLoadingShares] = useState(true)

  // Browser notifications state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [notifEnabled, setNotifEnabled] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) {
      setNotifPermission('unsupported')
    } else {
      setNotifPermission(Notification.permission)
      // Default ON — only off if the user has explicitly disabled it
      setNotifEnabled(
        Notification.permission === 'granted' &&
        localStorage.getItem('amplify-notifications-enabled') !== '0'
      )
    }
  }, [])

  async function handleNotifToggle() {
    if (notifPermission === 'unsupported') return

    if (notifEnabled) {
      // Turn off
      localStorage.setItem('amplify-notifications-enabled', '0')
      setNotifEnabled(false)
      return
    }

    // Turn on — request permission if needed
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      setNotifPermission(result)
      if (result !== 'granted') return
    }

    if (Notification.permission === 'granted') {
      // Remove the explicit '0' so the default-on logic kicks in
      localStorage.removeItem('amplify-notifications-enabled')
      setNotifEnabled(true)
      new Notification('🔔 Amplify Notifications On', {
        body: "You'll be notified when new sharing moments are available.",
        icon: '/amplify-icon.png',
      })
    }
  }

  const user = session?.user as SessionUser | undefined

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        setLoadingProfile(false)
      })
      .catch(() => setLoadingProfile(false))

    fetch('/api/shares?limit=20')
      .then((r) => r.json())
      .then((data) => {
        setShares(Array.isArray(data) ? data : [])
        setLoadingShares(false)
      })
      .catch(() => setLoadingShares(false))
  }, [])

  const linkedinShares = shares.filter((s) => s.platform === 'linkedin').length
  const xShares = shares.filter((s) => s.platform === 'x').length

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-400',
    manager: 'bg-purple-500/10 text-purple-400',
    employee: 'bg-green-500/10 text-green-400',
  }

  return (
    <div>
      {/* Header */}
      <div className="border-b border-border px-8 py-10 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-heading text-4xl font-light text-foreground mb-1">My Profile</h1>
          <p className="text-muted-foreground text-sm">
            Your advocacy stats and voice settings
          </p>
        </motion.div>
      </div>

      <div className="px-8 py-6 space-y-6 max-w-4xl">
        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-start gap-5">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || 'User'}
                className="h-20 w-20 rounded-2xl ring-4 ring-primary/20"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {user?.name || 'Loading...'}
                  </h2>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                  <span
                    className={`inline-flex items-center mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full font-mono-caps ${
                      roleColors[user?.role || 'employee'] || roleColors.employee
                    }`}
                  >
                    {user?.role || 'employee'}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-primary mb-1">
                    <Zap className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {(user?.points || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-primary/70 font-medium font-mono-caps">Points</p>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {loadingShares ? '—' : shares.length}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium font-mono-caps">Total Shares</p>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.floor((user?.points || 0) / 10)}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium font-mono-caps">Packages shared</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voice setup */}
        {!loadingProfile && (
          <VoiceSetup
            profile={profile}
            onUpdate={(updated) => setProfile(updated)}
          />
        )}

        {/* Browser notifications */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {notifEnabled ? (
                  <BellRing className="h-4.5 w-4.5 text-primary" />
                ) : (
                  <Bell className="h-4.5 w-4.5 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Browser Notifications</h3>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {notifPermission === 'unsupported'
                    ? 'Your browser does not support notifications.'
                    : notifPermission === 'denied'
                    ? 'Notifications are blocked. Enable them in your browser site settings, then come back.'
                    : notifEnabled
                    ? "You'll be notified when new sharing moments appear."
                    : 'Get notified when new sharing moments are available.'}
                </p>
              </div>
            </div>

            {notifPermission !== 'unsupported' && notifPermission !== 'denied' && (
              <button
                onClick={handleNotifToggle}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card ${
                  notifEnabled ? 'bg-primary' : 'bg-secondary border border-border'
                }`}
                role="switch"
                aria-checked={notifEnabled}
              >
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mx-1 ${
                  notifEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            )}

            {notifPermission === 'denied' && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500 shrink-0">
                <BellOff className="h-3.5 w-3.5" />
                Blocked
              </div>
            )}
          </div>
        </div>

        {/* Share history */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Share History</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Linkedin className="h-3.5 w-3.5 text-blue-400" />
                {linkedinShares} LinkedIn
              </span>
              <span className="flex items-center gap-1">
                <Twitter className="h-3.5 w-3.5 text-muted-foreground" />
                {xShares} X
              </span>
            </div>
          </div>

          {loadingShares ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : shares.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Share2 className="h-8 w-8 mx-auto mb-3 text-primary/30" />
              <p className="text-sm font-medium">No shares yet</p>
              <p className="text-xs mt-1">
                Head to the feed and share your first piece of content!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className={`rounded-lg p-2 ${
                      share.platform === 'linkedin'
                        ? 'bg-blue-500/10'
                        : 'bg-secondary'
                    }`}
                  >
                    {share.platform === 'linkedin' ? (
                      <Linkedin className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Twitter className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(share as { packages?: { title: string } }).packages?.title ||
                        'Unknown package'}
                    </p>
                    {share.copy_used && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {share.copy_used.slice(0, 100)}
                        {share.copy_used.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(share.shared_at), {
                      addSuffix: true,
                    })}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                    <Zap className="h-3 w-3" />
                    +10
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
