'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import PackageFeed from '@/components/feed/PackageFeed'
import { Sparkles, Search } from 'lucide-react'
import type { Package, SharingMoment } from '@/lib/types'

const MomentCard = dynamic(() => import('@/components/feed/MomentCard'), { ssr: false })

const OnboardingModal = dynamic(() => import('@/components/onboarding/OnboardingModal'), { ssr: false })

interface SessionUser {
  name?: string | null
}

export default function FeedPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [packages, setPackages] = useState<Package[]>([])
  const [moments, setMoments] = useState<SharingMoment[]>([])
  const [momentView, setMomentView] = useState<'active' | 'expired' | 'shared'>('active')
  const [momentViewLoading, setMomentViewLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)
  // Auto-open a moment's share modal when linked from the extension (?moment=ID)
  const [autoOpenMomentId, setAutoOpenMomentId] = useState<string | null>(null)

  useEffect(() => {
    const momentParam = searchParams.get('moment')
    if (momentParam) setAutoOpenMomentId(momentParam)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.json())
      .then((data) => {
        setPackages(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/moments')
      .then((r) => r.json())
      .then((data) => setMoments(Array.isArray(data) ? data : []))
      .catch(() => {})


    // Check if onboarding needed
    fetch('/api/profile')
      .then(r => r.json())
      .then(profile => {
        if (!profile.onboarding_completed && !profile.linkedin_url) {
          setShowOnboarding(true)
        }
        setProfileChecked(true)
      })
      .catch(() => setProfileChecked(true))
  }, [])

  async function switchMomentView(view: 'active' | 'expired' | 'shared') {
    setMomentView(view)
    setMomentViewLoading(true)
    const url = view === 'active' ? '/api/moments' : `/api/moments?view=${view}`
    const data = await fetch(url).then((r) => r.json()).catch(() => [])
    setMoments(Array.isArray(data) ? data : [])
    setMomentViewLoading(false)
  }

  const user = session?.user as SessionUser | undefined
  const firstName = user?.name?.split(' ')[0] || 'there'

  const filtered = packages.filter((p) => {
    return (
      search === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
  })

  // Suppress unused variable warning — profileChecked gates future conditional rendering
  void profileChecked

  return (
    <>
    <AnimatePresence>
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </AnimatePresence>
    <div>
      {/* Hero banner */}
      <div className="border-b border-border px-8 py-10 bg-background">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-xs text-primary font-mono-caps mb-2 tracking-widest">Ready to amplify</p>
          <h1 className="font-heading text-4xl font-light text-foreground mb-2">
            What&apos;s worth sharing today, {firstName}?
          </h1>
          <p className="text-muted-foreground text-sm">Each share earns you 10 points on the leaderboard.</p>
        </motion.div>
      </div>

      <div className="px-8 py-6">
        {/* Search bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        {/* Sharing Moments */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">Sharing Moments</h2>
            {momentView === 'active' && moments.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono-caps">{moments.length} active</span>
            )}
            <div className="ml-auto flex gap-1">
              {([
                { id: 'active', label: 'Active' },
                { id: 'expired', label: 'Expired / Dismissed' },
                { id: 'shared', label: 'Shared History' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => switchMomentView(id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    momentView === id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground border border-border hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {momentViewLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-40 bg-card rounded-2xl border border-border animate-pulse" />)}
            </div>
          ) : moments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {momentView === 'active' ? 'No active sharing moments right now.' :
               momentView === 'expired' ? 'No expired or dismissed moments yet.' :
               'You haven\'t shared any moments yet.'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {moments.map((m, i) => (
                  <MomentCard
                    key={m.id}
                    moment={m}
                    index={i}
                    autoOpen={autoOpenMomentId === m.id}
                    onDismiss={(id) => setMoments((prev) => prev.filter((x) => x.id !== id))}
                    onShared={(id) => {
                      if (momentView === 'active') {
                        setMoments((prev) => prev.filter((x) => x.id !== id))
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-card rounded-2xl h-64 animate-pulse border border-border"
              />
            ))}
          </div>
        ) : filtered.length === 0 && moments.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/30" />
            <p className="text-lg font-medium text-foreground">
              {search ? 'No content matches your search' : 'No content packages yet'}
            </p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term.' : 'Check back soon — your marketing team is cooking something up.'}
            </p>
          </div>
        ) : (
          <PackageFeed packages={filtered} />
        )}
      </div>
    </div>
    </>
  )
}
