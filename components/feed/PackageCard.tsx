'use client'
import { motion } from 'framer-motion'
import { Linkedin, Twitter } from 'lucide-react'
import type { Package } from '@/lib/types'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const ShareModal = dynamic(() => import('./ShareModal'), { ssr: false })

const gradients = [
  'from-orange-950/60 to-orange-900/20',
  'from-slate-800 to-slate-900',
  'from-zinc-800 to-zinc-900',
  'from-stone-800 to-stone-900',
]

interface Props {
  pkg: Package
  index: number
}

export default function PackageCard({ pkg, index }: Props) {
  const [shareOpen, setShareOpen] = useState(false)
  const gradient = gradients[index % gradients.length]

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
        whileHover={{ y: -2 }}
        className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col group transition-colors hover:border-primary/30 cursor-pointer"
        onClick={() => setShareOpen(true)}
      >
        {/* Cover */}
        <div className={cn('h-36 bg-gradient-to-br relative', pkg.cover_image_url ? '' : gradient)}>
          {pkg.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pkg.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-end p-4">
              <span className="font-heading text-2xl font-light text-white/20 leading-tight line-clamp-2">
                {pkg.title}
              </span>
            </div>
          )}
          {/* Platform badges */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            {pkg.platform_targets.includes('linkedin') && (
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-mono-caps px-2 py-0.5 rounded-full">
                <Linkedin size={9} /> in
              </span>
            )}
            {pkg.platform_targets.includes('x') && (
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] font-mono-caps px-2 py-0.5 rounded-full">
                <Twitter size={9} /> x
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          <div>
            <h3 className="font-medium text-foreground text-sm leading-snug mb-1 line-clamp-2">{pkg.title}</h3>
            {pkg.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{pkg.description}</p>
            )}
          </div>

          {/* Tags */}
          {pkg.tags && pkg.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pkg.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] font-mono-caps text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-2 border-t border-border flex items-center justify-between">
            {pkg.share_count !== undefined && (
              <span className="text-[10px] text-muted-foreground font-mono-caps">{pkg.share_count} shares</span>
            )}
            <button
              onClick={e => { e.stopPropagation(); setShareOpen(true) }}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors group-hover:gap-2.5"
            >
              Share <span className="transition-all">→</span>
            </button>
          </div>
        </div>
      </motion.div>

      <ShareModal pkg={pkg} open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  )
}
