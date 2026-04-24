export async function notifyNewPackage(pkg: {
  title: string
  description?: string | null
  id: string
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📣 New content to share on Amplify!' },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${pkg.title}*\n${pkg.description || 'New content package available for sharing.'}`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View & Share →' },
          url: `${appUrl}/feed`,
          action_id: 'view_package',
          style: 'primary',
        },
      },
    ],
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Failed to send Slack notification:', err)
  }
}
