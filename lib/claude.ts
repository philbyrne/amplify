import Anthropic from '@anthropic-ai/sdk'
import type { CopyGenerationRequest } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateCopy(params: CopyGenerationRequest): Promise<string> {
  const {
    platform,
    packageTitle,
    packageBody,
    exampleCopies,
    voiceProfile,
    formalityScore,
    voiceInfluenceScore,
    audienceScore,
    lengthTarget,
    cta,
    ctaUrl,
    differentiators,
    variationIndex,
  } = params

  const charLimit = platform === 'x' ? Math.min(lengthTarget ?? 140, 140) : (lengthTarget ?? 1300)
  const platformName = platform === 'linkedin' ? 'LinkedIn' : 'X (Twitter)'

  const voiceContext =
    voiceProfile && voiceProfile.posts.length > 0
      ? `\n\nThe user's voice (from their recent posts):\n${voiceProfile.posts
          .slice(0, 5)
          .map((p) => `- "${p}"`)
          .join('\n')}\n\nMimic their vocabulary, sentence length, and punctuation style.`
      : ''

  const audienceContext = voiceProfile?.audience_context
    ? `\n\nThis person's likely audience: ${voiceProfile.audience_context}`
    : ''

  const experienceContext = voiceProfile?.experience_summary
    ? `\nTheir role: ${voiceProfile.experience_summary}`
    : ''

  const toneInstructions = `
- Formality: ${formalityScore}/100 (0=very casual, 100=very professional)
- Voice influence: ${voiceInfluenceScore}/100 — ${voiceInfluenceScore > 60 ? 'strongly mirror their personal writing style from the voice samples' : voiceInfluenceScore > 30 ? 'lightly incorporate their style' : 'use a neutral voice'}
- Audience tailoring: ${audienceScore}/100 — ${audienceScore > 60 ? 'use terminology and framing specific to their professional audience' : audienceScore > 30 ? 'lightly tailor for their audience' : 'write for a general professional audience'}`

  // If there's a CTA URL, embed it directly — no tracking placeholder needed
  const linkInstruction = ctaUrl
    ? `- Include this exact URL in the post, unchanged: ${ctaUrl} — do NOT use {{SHARE_URL}}`
    : '- Include the placeholder {{SHARE_URL}} naturally in the post where a link would fit'

  const ctaTextContext = cta
    ? `\n\nCTA intent (paraphrase this, do NOT use verbatim): "${cta}"`
    : ''

  const diffContext =
    differentiators.length > 0
      ? `\nWeave in one or two of these key differentiators naturally: ${differentiators.join(', ')}`
      : ''

  const examplesContext =
    exampleCopies.length > 0
      ? `\n\nExample copy starters from the marketing team (use as inspiration, not copy-paste):\n${exampleCopies.map((e) => `- "${e}"`).join('\n')}`
      : ''

  const systemPrompt = `You are an expert social media ghostwriter. Write a single social media post for ${platformName} on behalf of an Intercom employee.

Rules:
- Maximum ${charLimit} characters (CRITICAL — count carefully)
- Platform: ${platformName}
- Write in first person as the employee
- Sound human and authentic, not like corporate marketing
- ${linkInstruction}
- Do NOT include hashtags unless the formality is very low
- Return ONLY the post text, nothing else

Hard style rules (violations make the post sound AI-generated):
- NEVER use em dashes (—) anywhere
- NEVER use comparison stacking: "not just X, but Y" / "more than just" / "not only X but also Y"
- NEVER use hype words: game-changing, revolutionary, transformative, innovative, cutting-edge, groundbreaking, proud to announce, thrilled, delighted, excited to share
- NEVER open with "I'm [emotion] to" or "We're [emotion] to"
- NEVER use bullet points or numbered lists
- Vary sentence length — mix short punchy sentences with longer ones
- No corporate buzzwords or jargon${voiceContext}${audienceContext}${experienceContext}${ctaTextContext}`

  const userPrompt = `Content to share:
Title: ${packageTitle}
${packageBody ? `Details: ${packageBody}` : ''}
${examplesContext}

Tone guidance:${toneInstructions}${diffContext}

Variation seed: ${variationIndex} (generate a distinctly different angle/opening than you would by default)

Write the post:`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text.trim()
}
