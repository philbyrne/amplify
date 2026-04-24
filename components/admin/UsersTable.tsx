'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Zap, ChevronDown, Check } from 'lucide-react'
import type { User as UserType } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  users: UserType[]
  currentUserRole: string
  onRoleChange: (userId: string, newRole: string) => Promise<void>
}

const ROLES = ['employee', 'manager', 'admin'] as const
type Role = (typeof ROLES)[number]

const roleColors: Record<Role, string> = {
  employee: 'bg-green-500/10 text-green-400',
  manager: 'bg-purple-500/10 text-purple-400',
  admin: 'bg-red-500/10 text-red-400',
}

function RoleSelector({
  userId,
  currentRole,
  isAdmin,
  onRoleChange,
}: {
  userId: string
  currentRole: string
  isAdmin: boolean
  onRoleChange: (userId: string, newRole: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleChange(role: Role) {
    if (role === currentRole) {
      setOpen(false)
      return
    }
    setLoading(true)
    await onRoleChange(userId, role)
    setLoading(false)
    setOpen(false)
  }

  if (!isAdmin) {
    return (
      <span
        className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full font-mono-caps ${
          roleColors[(currentRole as Role) || 'employee']
        }`}
      >
        {currentRole}
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all font-mono-caps ${
          roleColors[(currentRole as Role) || 'employee']
        } hover:opacity-80 disabled:opacity-50`}
      >
        {loading ? '...' : currentRole}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-lg z-10 py-1 min-w-[130px]">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => handleChange(role)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
            >
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full font-mono-caps ${roleColors[role]}`}
              >
                {role}
              </span>
              {role === currentRole && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UsersTable({
  users,
  currentUserRole,
  onRoleChange,
}: Props) {
  const isAdmin = currentUserRole === 'admin'

  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-4 text-primary/30" />
        <p className="text-sm">No users yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide px-6 py-3">
              User
            </th>
            <th className="text-left text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide px-6 py-3">
              Role
            </th>
            <th className="text-left text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide px-6 py-3">
              Points
            </th>
            <th className="text-left text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide px-6 py-3">
              LinkedIn
            </th>
            <th className="text-left text-xs font-semibold text-muted-foreground font-mono-caps uppercase tracking-wide px-6 py-3">
              Joined
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user, idx) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="hover:bg-secondary/50 transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <RoleSelector
                  userId={user.id}
                  currentRole={user.role}
                  isAdmin={isAdmin}
                  onRoleChange={onRoleChange}
                />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  {user.points.toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-4">
                {user.linkedin_url ? (
                  <a
                    href={user.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Profile →
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(user.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
