'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import { Trophy, Zap } from 'lucide-react'
import type { LeaderboardEntry } from '@/lib/types'

interface SessionUser {
  id?: string
  name?: string | null
}

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'all' | 'monthly'>('all')

  const user = session?.user as SessionUser | undefined

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [period])

  const currentUserEntry = entries.find((e) => e.userId === user?.id)

  return (
    <div>
      {/* Header */}
      <div className="border-b border-border px-8 py-10 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 text-primary text-xs font-mono-caps mb-2 tracking-widest">
            <Trophy className="h-4 w-4" />
            <span>Employee Advocacy Leaderboard</span>
          </div>
          <h1 className="font-heading text-4xl font-light text-foreground mb-1">Who&apos;s amplifying the most?</h1>
          <p className="text-muted-foreground text-sm">
            Share content, earn points, climb the ranks.
          </p>
        </motion.div>
      </div>

      <div className="px-8 py-6">
        {/* Period toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 bg-secondary rounded-xl p-1">
            <button
              onClick={() => setPeriod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === 'all'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === 'monthly'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              This Month
            </button>
          </div>

          {currentUserEntry && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                You&apos;re #{currentUserEntry.rank} with{' '}
                {currentUserEntry.points.toLocaleString()} pts
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-16 animate-pulse border border-border" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-primary/30" />
            <p className="text-lg font-medium text-foreground">No shares yet</p>
            <p className="text-sm mt-1">
              Be the first to share content and claim the #1 spot!
            </p>
          </div>
        ) : (
          <LeaderboardTable
            entries={entries}
            currentUserId={user?.id}
          />
        )}
      </div>
    </div>
  )
}
