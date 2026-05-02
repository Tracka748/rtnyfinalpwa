import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/get-user'
import CrewDetailClient from './CrewDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CrewDetailPage({ params }: PageProps) {
  const { id } = await params
  const { user } = await getCurrentUser()

  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const res = await fetch(`${baseUrl}/api/v1/crews/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  })

  if (res.status === 404) {
    notFound()
  }

  if (res.status === 403) {
    return (
      <CrewDetailClient
        crew={null}
        userId={user?.id ?? null}
        isPrivateLocked
      />
    )
  }

  const json = await res.json()
  if (!json.success) {
    notFound()
  }

  return (
    <CrewDetailClient
      crew={json.data}
      userId={user?.id ?? null}
      isPrivateLocked={false}
    />
  )
}
