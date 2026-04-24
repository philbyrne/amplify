'use client'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Atmospheric glow — reinforced for login page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/8 rounded-full blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-5xl font-light text-foreground mb-3">Amplify</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Turn your team into your<br />best marketing channel
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-base font-medium text-foreground mb-1">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Use your @intercom.io Google account</p>
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: '/feed' })}
            className="w-full flex items-center justify-center gap-3 bg-foreground hover:bg-foreground/90 text-background font-medium py-3 px-5 rounded-xl transition-all duration-150 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Restricted to @intercom.io accounts
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          © {new Date().getFullYear()} Intercom
        </p>
      </motion.div>
    </div>
  )
}
