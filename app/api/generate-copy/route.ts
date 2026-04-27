import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateCopy } from '@/lib/claude'
import type { CopyGenerationRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const {
      platform,
      packageId,
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
      selectedAssetContext,
    } = body

    if (!platform || !packageTitle) {
      return NextResponse.json(
        { error: 'platform and packageTitle are required' },
        { status: 400 }
      )
    }

    const request: CopyGenerationRequest = {
      platform: platform === 'x' ? 'x' : 'linkedin',
      packageId: packageId || '',
      packageTitle,
      packageBody: packageBody || '',
      exampleCopies: Array.isArray(exampleCopies) ? exampleCopies : [],
      voiceProfile: voiceProfile || null,
      formalityScore: typeof formalityScore === 'number' ? formalityScore : 50,
      voiceInfluenceScore: typeof voiceInfluenceScore === 'number' ? voiceInfluenceScore : 70,
      audienceScore: typeof audienceScore === 'number' ? audienceScore : 60,
      lengthTarget: typeof lengthTarget === 'number' ? lengthTarget : 500,
      cta: typeof cta === 'string' ? cta : undefined,
      ctaUrl: typeof ctaUrl === 'string' ? ctaUrl : undefined,
      differentiators: Array.isArray(differentiators) ? differentiators : [],
      variationIndex: typeof variationIndex === 'number' ? variationIndex : 0,
      selectedAssetContext: typeof selectedAssetContext === 'string' ? selectedAssetContext : undefined,
    }

    const copy = await generateCopy(request)
    return NextResponse.json({ copy })
  } catch (err) {
    console.error('POST /api/generate-copy error:', err)
    return NextResponse.json(
      { error: 'Failed to generate copy' },
      { status: 500 }
    )
  }
}
