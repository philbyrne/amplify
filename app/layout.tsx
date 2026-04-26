import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from './providers'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Amplify — Employee Advocacy',
  description: 'Turn your team into your best marketing channel',
  icons: {
    icon: '/amplify-icon.png',
    apple: '/amplify-icon.png',
  },
}

// Runs synchronously before first paint — prevents theme flash
const themeScript = `
(function(){
  var t=localStorage.getItem('amplify-theme')||'system';
  var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark',dark);
})()
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
