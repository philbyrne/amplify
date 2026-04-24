'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { BarChart3, Share2, Users, TrendingUp, Linkedin, Twitter } from 'lucide-react'
import { format, subDays, parseISO, startOfDay } from 'date-fns'
import type { Share } from '@/lib/types'

interface SessionUser {
  role?: string
  email?: string | null
}

interface ShareWithJoins extends Share {
  packages?: { title: string }
  sharing_moments?: { title: string }
  users?: { name: string | null }
}

interface DayData {
  date: string
  shares: number
  linkedin: number
  x: number
}

interface PackageData {
  name: string
  shares: number
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [shares, setShares] = useState<ShareWithJoins[]>([])
  const [loading, setLoading] = useState(true)

  const user = session?.user as SessionUser | undefined
  const isManager = user?.role === 'manager' || user?.role === 'admin'
    || user?.email === 'phil@intercom.io'

  useEffect(() => {
    if (session && !isManager) {
      router.push('/feed')
    }
  }, [session, isManager, router])

  useEffect(() => {
    fetch('/api/shares?limit=200')
      .then((r) => r.json())
      .then((data) => {
        setShares(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Build daily chart data (last 30 days)
  const dailyData: DayData[] = []
  for (let i = 29; i >= 0; i--) {
    const day = startOfDay(subDays(new Date(), i))
    const dateStr = format(day, 'MMM d')
    const dayShares = shares.filter(
      (s) =>
        format(startOfDay(parseISO(s.shared_at)), 'MMM d') === dateStr
    )
    dailyData.push({
      date: dateStr,
      shares: dayShares.length,
      linkedin: dayShares.filter((s) => s.platform === 'linkedin').length,
      x: dayShares.filter((s) => s.platform === 'x').length,
    })
  }

  // Platform breakdown
  const linkedinCount = shares.filter((s) => s.platform === 'linkedin').length
  const xCount = shares.filter((s) => s.platform === 'x').length
  const platformData = [
    { name: 'LinkedIn', value: linkedinCount, color: '#0077b5' },
    { name: 'X', value: xCount, color: '#888' },
  ]

  // Top shares by content item (packages or moments)
  const contentCounts: Record<string, { name: string; count: number }> = {}
  for (const share of shares) {
    const s = share as ShareWithJoins
    // Build a stable key: prefer package_id, fall back to moment_id
    const key = share.package_id ? `pkg:${share.package_id}` : share.moment_id ? `mom:${share.moment_id}` : null
    if (!key) continue
    if (!contentCounts[key]) {
      const title = s.packages?.title || s.sharing_moments?.title || key.slice(4, 12)
      contentCounts[key] = { name: title, count: 0 }
    }
    contentCounts[key].count++
  }
  const topPackages: PackageData[] = Object.values(contentCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((p) => ({ name: p.name, shares: p.count }))

  const totalShares = shares.length
  const last7DayShares = dailyData.slice(-7).reduce((s, d) => s + d.shares, 0)
  const prev7DayShares = dailyData.slice(-14, -7).reduce((s, d) => s + d.shares, 0)
  const weekGrowth =
    prev7DayShares === 0
      ? 100
      : Math.round(((last7DayShares - prev7DayShares) / prev7DayShares) * 100)

  const uniqueUsers = new Set(shares.map((s) => s.user_id)).size

  const stats = [
    {
      label: 'Total Shares',
      value: totalShares.toLocaleString(),
      icon: Share2,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Last 7 Days',
      value: last7DayShares.toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-400 bg-green-500/10',
      sub: `${weekGrowth >= 0 ? '+' : ''}${weekGrowth}% vs prev week`,
    },
    {
      label: 'LinkedIn',
      value: linkedinCount.toLocaleString(),
      icon: Linkedin,
      color: 'text-blue-400 bg-blue-500/10',
    },
    {
      label: 'Active Advocates',
      value: uniqueUsers.toLocaleString(),
      icon: Users,
      color: 'text-purple-400 bg-purple-500/10',
    },
  ]

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl h-48 animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="bg-background border-b border-border px-8 py-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-heading text-3xl font-light text-foreground">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Track your advocacy program performance
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-card rounded-2xl border border-border p-5"
            >
              <div className={`inline-flex p-2 rounded-xl ${stat.color} mb-3`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
              {stat.sub && (
                <p
                  className={`text-xs mt-1 font-medium ${
                    weekGrowth >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {stat.sub}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Daily shares chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-6">
            Shares Over Time (Last 30 Days)
          </h2>
          {shares.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No shares recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 14% 16%)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'hsl(225 8% 48%)' }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(225 8% 48%)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(225 14% 16%)',
                    background: 'hsl(225 20% 7%)',
                    color: 'hsl(0 0% 95%)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="linkedin"
                  stroke="#0077b5"
                  strokeWidth={2}
                  dot={false}
                  name="LinkedIn"
                />
                <Line
                  type="monotone"
                  dataKey="x"
                  stroke="hsl(225 8% 48%)"
                  strokeWidth={2}
                  dot={false}
                  name="X"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Platform breakdown */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-6">
              Platform Breakdown
            </h2>
            {totalShares === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No shares yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => value}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(225 14% 16%)',
                      background: 'hsl(225 20% 7%)',
                      color: 'hsl(0 0% 95%)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <Linkedin className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-foreground">{linkedinCount}</span>
                <span className="text-muted-foreground">LinkedIn</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Twitter className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{xCount}</span>
                <span className="text-muted-foreground">X</span>
              </div>
            </div>
          </div>

          {/* Top packages */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-6">
              Top Shares for the Period
            </h2>
            {topPackages.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topPackages} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 14% 16%)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'hsl(225 8% 48%)' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'hsl(225 8% 48%)' }}
                    tickLine={false}
                    width={120}
                    tickFormatter={(v: string) =>
                      v.length > 16 ? v.slice(0, 16) + '…' : v
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(225 14% 16%)',
                      background: 'hsl(225 20% 7%)',
                      color: 'hsl(0 0% 95%)',
                    }}
                  />
                  <Bar dataKey="shares" fill="hsl(20 100% 50%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
