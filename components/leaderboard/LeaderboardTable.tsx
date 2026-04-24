'use client'
import { motion } from 'framer-motion'
import { Crown, Medal, User, Share2, Zap } from 'lucide-react'
import type { LeaderboardEntry } from '@/lib/types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <Crown className="h-5 w-5 text-amber-400 fill-amber-400 drop-shadow-sm" />
    )
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400 fill-slate-400" />
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600 fill-amber-600" />
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>
}

function getRankBg(rank: number, isCurrentUser: boolean) {
  if (isCurrentUser) return 'bg-primary/5 border-primary/30'
  if (rank === 1) return 'bg-amber-500/5 border-amber-500/20'
  if (rank === 2) return 'bg-slate-500/5 border-slate-500/20'
  if (rank === 3) return 'bg-amber-700/5 border-amber-700/20'
  return 'bg-card border-border'
}

export default function LeaderboardTable({ entries, currentUserId }: Props) {
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="space-y-6">
      {/* Podium for top 3 */}
      {top3.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide mb-4">
            Top Advocates
          </h3>
          <div className="flex gap-4 justify-center items-end mb-6">
            {/* 2nd place */}
            {top3[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center gap-2 flex-1 max-w-[160px]"
              >
                <div className="relative">
                  {top3[1].avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={top3[1].avatar_url}
                      alt={top3[1].name || 'User'}
                      className="h-14 w-14 rounded-full ring-4 ring-slate-500/40"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center ring-4 ring-slate-500/40">
                      <User className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-slate-500 rounded-full h-6 w-6 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                    {top3[1].name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {top3[1].points.toLocaleString()} pts
                  </p>
                </div>
                <div className="w-full h-20 bg-slate-500/10 rounded-t-xl flex items-center justify-center border border-slate-500/20 border-b-0">
                  <Medal className="h-6 w-6 text-slate-400 fill-slate-400" />
                </div>
              </motion.div>
            )}

            {/* 1st place */}
            {top3[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex flex-col items-center gap-2 flex-1 max-w-[180px]"
              >
                <Crown className="h-6 w-6 text-amber-400 fill-amber-400" />
                <div className="relative">
                  {top3[0].avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={top3[0].avatar_url}
                      alt={top3[0].name || 'User'}
                      className="h-18 w-18 rounded-full ring-4 ring-primary"
                      style={{ height: '4.5rem', width: '4.5rem' }}
                    />
                  ) : (
                    <div
                      className="rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary"
                      style={{ height: '4.5rem', width: '4.5rem' }}
                    >
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-primary rounded-full h-6 w-6 flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-bold">1</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground truncate max-w-[160px]">
                    {top3[0].name || 'Anonymous'}
                  </p>
                  <p className="text-xs font-semibold text-primary">
                    {top3[0].points.toLocaleString()} pts
                  </p>
                </div>
                <div className="w-full h-28 bg-primary/10 rounded-t-xl flex items-center justify-center border border-primary/20 border-b-0">
                  <Crown className="h-8 w-8 text-primary/60 fill-primary/40" />
                </div>
              </motion.div>
            )}

            {/* 3rd place */}
            {top3[2] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-col items-center gap-2 flex-1 max-w-[160px]"
              >
                <div className="relative">
                  {top3[2].avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={top3[2].avatar_url}
                      alt={top3[2].name || 'User'}
                      className="h-14 w-14 rounded-full ring-4 ring-amber-700/40"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-amber-900/20 flex items-center justify-center ring-4 ring-amber-700/40">
                      <User className="h-7 w-7 text-amber-600" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-amber-700 rounded-full h-6 w-6 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                    {top3[2].name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {top3[2].points.toLocaleString()} pts
                  </p>
                </div>
                <div className="w-full h-14 bg-amber-700/10 rounded-t-xl flex items-center justify-center border border-amber-700/20 border-b-0">
                  <Medal className="h-5 w-5 text-amber-600 fill-amber-500" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Rest of the list */}
      {rest.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide mb-3">
            Rankings
          </h3>
          <div className="space-y-2">
            {rest.map((entry, idx) => {
              const isCurrentUser = entry.userId === currentUserId
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${getRankBg(
                    entry.rank,
                    isCurrentUser
                  )}`}
                >
                  <div className="w-8 flex justify-center shrink-0">
                    <MedalIcon rank={entry.rank} />
                  </div>

                  {entry.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.avatar_url}
                      alt={entry.name || 'User'}
                      className="h-9 w-9 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-sm truncate ${
                        isCurrentUser ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {entry.name || 'Anonymous'}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        {entry.shareCount} shares
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-sm text-foreground">
                      {entry.points.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
