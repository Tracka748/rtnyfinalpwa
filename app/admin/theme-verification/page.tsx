'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Clock, Calendar, Building2, Palette } from 'lucide-react'
import Image from 'next/image'

interface ThemeVerificationPhoto {
  id: string
  url: string
  media_type: string
  photo_review_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  partners?: { display_name: string } | null
  partner_theme_tags?: {
    theme_id: string
    partner_id: string
    themes?: { name: string } | null
  } | null
}

export default function AdminThemeVerificationPage() {
  const [photos, setPhotos] = useState<ThemeVerificationPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchPhotos()
  }, [filter])

  async function fetchPhotos() {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/admin/theme-verification?status=${filter}`)
      const data = await response.json()

      if (data.success) {
        setPhotos(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch theme verification photos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(photoId: string) {
    if (!confirm("Approve this photo? It will verify the partner's theme tag.")) {
      return
    }

    try {
      setProcessing(photoId)
      const response = await fetch(`/api/v1/admin/theme-verification/${photoId}/approve`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        fetchPhotos()
      } else {
        alert(data.error || 'Failed to approve photo')
      }
    } catch (error) {
      console.error('Failed to approve:', error)
      alert('An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(photoId: string) {
    if (!confirm('Reject this photo?')) {
      return
    }

    try {
      setProcessing(photoId)
      const response = await fetch(`/api/v1/admin/theme-verification/${photoId}/reject`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        fetchPhotos()
      } else {
        alert(data.error || 'Failed to reject photo')
      }
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: ThemeVerificationPhoto['photo_review_status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Theme Verification</h1>
        <p className="text-[#7DD8E8]">Review photo-proof theme tag submissions from partners</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({photos.filter(p => p.photo_review_status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-12">Loading theme verification photos...</div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[#7DD8E8]">
            No {filter !== 'all' ? filter : ''} photos found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {photos.map((photo) => (
            <Card key={photo.id}>
              <div className="grid md:grid-cols-[300px_1fr] gap-6">
                {/* Photo */}
                <div className="relative aspect-[4/5] bg-muted">
                  <Image
                    src={photo.url}
                    alt="Theme verification submission"
                    fill
                    className="object-cover rounded-l-lg"
                  />
                </div>

                {/* Details */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{photo.partners?.display_name ?? 'Unknown Partner'}</h2>
                    {getStatusBadge(photo.photo_review_status)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-[#7DD8E8]" />
                      <span className="font-medium">Partner:</span>
                      <span>{photo.partners?.display_name ?? 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Palette className="h-4 w-4 text-[#7DD8E8]" />
                      <span className="font-medium">Theme:</span>
                      <span>{photo.partner_theme_tags?.themes?.name ?? 'Unknown theme'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-[#7DD8E8]" />
                      <span className="font-medium">Submitted:</span>
                      <span>{new Date(photo.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {photo.photo_review_status === 'pending' && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(photo.id)}
                        disabled={processing === photo.id}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === photo.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => handleReject(photo.id)}
                        disabled={processing === photo.id}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
