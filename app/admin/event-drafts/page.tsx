'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Clock, Calendar, MapPin, DollarSign } from 'lucide-react'
import Image from 'next/image'

interface EventDraft {
  id: string
  name: string
  description: string | null
  category: string
  event_date: string
  venue_id: string
  flyer_image_url: string | null
  ticket_prices: Record<string, {
    name: string
    price: number
    quantity: number
    ticket_format?: 'digital' | 'physical' | 'both'
    fee_payer?: 'buyer' | 'promoter' | null
    printing_quantity?: number | null
    rtny_distribution?: boolean
  }>
  tier_discounts: Record<string, number> | null
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
  created_at: string
  venues?: {
    name: string
    address: string
  }
}

const TICKET_FORMAT_LABELS: Record<'digital' | 'physical' | 'both', string> = {
  digital: 'Digital',
  physical: 'Physical',
  both: 'Digital + Physical',
}

export default function AdminEventDraftsPage() {
  const [drafts, setDrafts] = useState<EventDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('pending_review')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [filter])

  async function fetchDrafts() {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const response = await fetch(`/api/v1/admin/event-drafts${params}`)
      const data = await response.json()

      if (data.success) {
        setDrafts(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(draftId: string) {
    if (!confirm('Approve and publish this event? It will be visible to all users.')) {
      return
    }

    try {
      setProcessing(draftId)
      const response = await fetch(`/api/v1/admin/event-drafts/${draftId}/approve`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('Event approved and published successfully!')
        fetchDrafts()
      } else {
        alert(data.error || 'Failed to approve event')
      }
    } catch (error) {
      console.error('Failed to approve:', error)
      alert('An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(draftId: string) {
    if (!confirm('Reject this event? The promoter will be able to edit and resubmit.')) {
      return
    }

    try {
      setProcessing(draftId)
      const response = await fetch(`/api/v1/admin/event-drafts/${draftId}/reject`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        fetchDrafts()
      } else {
        alert(data.error || 'Failed to reject event')
      }
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: EventDraft['status']) => {
    switch (status) {
      case 'pending_review':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Event Drafts Review</h1>
        <p className="text-[#7DD8E8]">Review and approve event submissions from promoters</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending_review">
            Pending ({drafts.filter(d => d.status === 'pending_review').length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-12">Loading event drafts...</div>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[#7DD8E8]">
            No {filter !== 'all' ? filter.replace('_', ' ') : ''} event drafts found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <div className="grid md:grid-cols-[300px_1fr] gap-6">
                {/* Flyer Image */}
                <div className="relative aspect-[4/5] bg-muted">
                  {draft.flyer_image_url ? (
                    <Image
                      src={draft.flyer_image_url}
                      alt={draft.name}
                      fill
                      className="object-cover rounded-l-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#7DD8E8]">
                      No Image
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{draft.name}</h2>
                    {getStatusBadge(draft.status)}
                  </div>

                  {draft.description && (
                    <p className="text-[#7DD8E8] mb-4">{draft.description}</p>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-[#7DD8E8]" />
                      <span className="font-medium">Date:</span>
                      <span>{new Date(draft.event_date).toLocaleString()}</span>
                    </div>
                    {draft.venues && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-[#7DD8E8]" />
                        <span className="font-medium">Venue:</span>
                        <span>{draft.venues.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Category:</span>
                      <span className="capitalize">{draft.category}</span>
                    </div>
                  </div>

                  {/* Ticket Pricing */}
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Ticket Pricing:</span>
                    </div>
                    <div className="space-y-3 text-sm">
                      {Object.entries(draft.ticket_prices).map(([slug, tt]) => {
                        const format = tt.ticket_format || 'digital'
                        const isPhysical = format === 'physical' || format === 'both'
                        return (
                          <div key={slug} className="border-b border-border last:border-0 pb-2 last:pb-0">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{tt.name || slug}</span>
                              <span className="font-medium">${Number(tt.price).toFixed(2)} · {tt.quantity} available</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{TICKET_FORMAT_LABELS[format]}</Badge>
                              {isPhysical && (
                                <span className="text-[#7DD8E8]">
                                  {tt.fee_payer === 'buyer' ? 'Buyer pays fee' : tt.fee_payer === 'promoter' ? 'Promoter absorbs fee' : 'Fee payer not set'}
                                  {tt.printing_quantity ? ` · Printing ${tt.printing_quantity}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {draft.status === 'pending_review' && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(draft.id)}
                        disabled={processing === draft.id}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === draft.id ? 'Processing...' : 'Approve & Publish'}
                      </Button>
                      <Button
                        onClick={() => handleReject(draft.id)}
                        disabled={processing === draft.id}
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