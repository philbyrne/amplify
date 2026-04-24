import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from './providers'

export const metadata: Metadata = {
  title: 'Amplify — Employee Advocacy',
  description: 'Turn your team into your best marketing channel',
  icons: {
    icon: '/amplify-icon.png',
    apple: '/amplify-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
