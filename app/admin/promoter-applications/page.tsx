'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Mail, Phone, Building } from 'lucide-react'

interface PromoterApplication {
  id: string
  user_id: string
  business_name: string
  contact_email: string
  phone: string | null
  website: string | null
  instagram_handle: string | null
  description: string | null
  expected_events_per_month: number | null
  status: 'pending' | 'approved' | 'rejected'
}

export default function AdminPromoterApplicationsPage() {
  const [applications, setApplications] = useState<PromoterApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [filter])

  async function fetchApplications() {
    try {
      setLoading(true)
      setFetchError(null)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const response = await fetch(`/api/v1/admin/promoter-applications${params}`)
      const data = await response.json()

      if (data.success) {
        setApplications(data.data)
      } else {
        setFetchError(data.error || data.details || `HTTP ${response.status}`)
        setApplications([])
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
      setFetchError(error instanceof Error ? error.message : 'Network error')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(applicationId: string) {
    try {
      setProcessing(applicationId)
      const response = await fetch(`/api/v1/admin/promoter-applications/${applicationId}/approve`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        fetchApplications()
      } else {
        alert(data.error || 'Failed to approve application')
      }
    } catch (error) {
      console.error('Failed to approve:', error)
      alert('An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(applicationId: string) {
    try {
      setProcessing(applicationId)
      const response = await fetch(`/api/v1/admin/promoter-applications/${applicationId}/reject`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        fetchApplications()
      } else {
        alert(data.error || 'Failed to reject application')
      }
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: PromoterApplication['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Promoter Applications</h1>
        <p className="text-[#7DD8E8]">Review and approve promoter account requests</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">Pending ({applications.filter(a => a.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-12">Loading applications...</div>
      ) : fetchError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500 font-medium mb-1">Failed to load applications</p>
            <p className="text-sm text-[#7DD8E8] font-mono">{fetchError}</p>
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[#7DD8E8]">
            No {filter !== 'all' ? filter : ''} applications found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{app.business_name}</CardTitle>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[#7DD8E8]" />
                    <span className="font-medium">Email:</span>
                    <span>{app.contact_email}</span>
                  </div>
                  {app.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-[#7DD8E8]" />
                      <span className="font-medium">Phone:</span>
                      <span>{app.phone}</span>
                    </div>
                  )}
                  {app.expected_events_per_month != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-[#7DD8E8]" />
                      <span className="font-medium">Events/month:</span>
                      <span>{app.expected_events_per_month}</span>
                    </div>
                  )}
                  {app.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Instagram:</span>
                      <span>@{app.instagram_handle}</span>
                    </div>
                  )}
                </div>

                {app.description && (
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Description:</p>
                    <p className="text-sm text-[#7DD8E8]">{app.description}</p>
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(app.id)}
                      disabled={processing === app.id}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {processing === app.id ? 'Processing...' : 'Approve'}
                    </Button>
                    <Button
                      onClick={() => handleReject(app.id)}
                      disabled={processing === app.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}