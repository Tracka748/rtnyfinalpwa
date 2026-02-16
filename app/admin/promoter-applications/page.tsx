'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Clock, Mail, Phone, Building } from 'lucide-react'

interface PromoterApplication {
  id: string
  user_id: string
  business_name: string
  business_type: string
  contact_email: string
  contact_phone: string | null
  experience_description: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export default function AdminPromoterApplicationsPage() {
  const [applications, setApplications] = useState<PromoterApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [filter])

  async function fetchApplications() {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const response = await fetch(`/api/v1/admin/promoter-applications${params}`)
      const data = await response.json()

      if (data.success) {
        setApplications(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
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
        <h1 className="text-3xl font-bold mb-2">Promoter Applications</h1>
        <p className="text-muted-foreground">Review and approve promoter account requests</p>
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
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
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
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{app.business_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Email:</span>
                    <span>{app.contact_email}</span>
                  </div>
                  {app.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Phone:</span>
                      <span>{app.contact_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Applied:</span>
                    <span>{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {app.experience_description && (
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Experience:</p>
                    <p className="text-sm text-muted-foreground">{app.experience_description}</p>
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