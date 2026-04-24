import type { Package } from '@/lib/types'
import PackageCard from './PackageCard'

export default function PackageFeed({ packages }: { packages: Package[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {packages.map((pkg, i) => (
        <PackageCard key={pkg.id} pkg={pkg} index={i} />
      ))}
    </div>
  )
}
