import crypto from 'crypto'

const SECRET = () => process.env.NEXTAUTH_SECRET || 'amplify-extension-secret'
const TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

export function createExtensionToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + TTL_MS })
  ).toString('base64url')
  const sig = crypto
    .createHmac('sha256', SECRET())
    .update(payload)
    .digest('base64url')
  return `${payload}.${sig}`
}

export function verifyExtensionToken(token: string): string | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 1) return null
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = crypto
      .createHmac('sha256', SECRET())
      .update(payload)
      .digest('base64url')
    if (sig !== expected) return null
    const { email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!email || typeof email !== 'string') return null
    if (Date.now() > exp) return null
    return email as string
  } catch {
    return null
  }
}
