import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — avoids module-level initialization at build time (no env vars available)
let _supabaseAdmin: SupabaseClient | null = null
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabaseAdmin
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: 'intercom.io',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email || ''
      if (!email.endsWith('@intercom.io')) return false

      const db = getSupabaseAdmin()

      // Check if user already exists
      const { data: existingUser } = await db
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (!existingUser) {
        // Create new user record
        await db.from('users').insert({
          id: crypto.randomUUID(),
          email,
          name: user.name || email.split('@')[0],
          avatar_url: user.image,
          role: 'employee',
          points: 0,
        })
      } else {
        // Update avatar/name in case they changed
        await db
          .from('users')
          .update({
            name: user.name || email.split('@')[0],
            avatar_url: user.image,
          })
          .eq('email', email)
      }

      return true
    },

    async session({ session, token }) {
      if (session.user?.email) {
        const db = getSupabaseAdmin()
        const { data: dbUser } = await db
          .from('users')
          .select('id, role, points, voice_profile, linkedin_url')
          .eq('email', session.user.email)
          .single()

        if (dbUser) {
          const u = session.user as typeof session.user & {
            id: string
            role: string
            points: number
            voice_profile: unknown
            linkedin_url: string | null
          }
          u.id = dbUser.id
          u.role = dbUser.role
          u.points = dbUser.points
          u.voice_profile = dbUser.voice_profile
          u.linkedin_url = dbUser.linkedin_url
        }
      }
      ;(session as typeof session & { access_token?: string }).access_token =
        token.access_token as string | undefined
      return session
    },

    async jwt({ token, account }) {
      if (account?.access_token) {
        token.access_token = account.access_token
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
}
