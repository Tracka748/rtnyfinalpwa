import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PackageExperience } from '@/components/custom/packages/PackageExperience'
import { safeExternalUrl } from '@/lib/safe-url'
import { getLiveDocument } from '@/lib/theme-package-page-data'

// Always read the live state: publishing or archiving a package must show up immediately.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ key: string }>
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key } = await params
  const doc = await getLiveDocument(key)
  if (!doc) return { title: 'Package not found' }
  const title = `${doc.meta.title} | RTNY`
  const description = truncate(doc.meta.subtitle ?? doc.meta.description ?? `${doc.occasion} package`, 160)
  const cover = safeExternalUrl(doc.meta.cover_image_url)
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images: cover ? [{ url: cover, alt: doc.meta.title }] : undefined },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title, description, images: cover ? [cover] : undefined },
  }
}

export default async function PackagePage({ params }: PageProps) {
  const { key } = await params
  const doc = await getLiveDocument(key)
  if (!doc) notFound()

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <PackageExperience initialDoc={doc} />
    </div>
  )
}
