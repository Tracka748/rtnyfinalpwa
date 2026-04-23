'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface EventDraft {
  id: string;
  name: string;
  description: string | null;
  category: string;
  event_date: string;
  venue_id?: string;
  venue_name: string | null;
  total_tickets: number;
  ticket_prices: Record<string, number>;
  flyer_image_url: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  published_event_id?: string;
}

const categoryConfig: Record<string, { icon: string; label: string }> = {
  nightlife: { icon: '🎉', label: 'Nightlife' },
  family: { icon: '👨‍👩‍👧‍👦', label: 'Family' },
  movies: { icon: '🎬', label: 'Movies' },
  dining: { icon: '🍽️', label: 'Dining' },
  arts: { icon: '🎨', label: 'Arts' },
  sports: { icon: '⚽', label: 'Sports' },
};

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    pending_review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

export function EventDraftCard({ draft, onDraftUpdate }: { draft: EventDraft; onDraftUpdate?: (deletedId?: string) => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cat = categoryConfig[draft.category] || { icon: '📅', label: draft.category };
  const eventDate = new Date(draft.event_date);
  const ticketTypeCount = Object.keys(draft.ticket_prices || {}).length;
  const minPrice = Math.min(...Object.values(draft.ticket_prices || { '': 0 }));

  const handleEdit = () => {
    router.push(`/promoter/events/create?draft=${draft.id}`);
  };

  const handleSubmit = async () => {
    console.log('Submit validation check:', {
      name: draft.name,
      category: draft.category,
      event_date: draft.event_date,
      venue_id: draft.venue_id,
      venue_name: draft.venue_name,
      ticket_prices: draft.ticket_prices,
      ticket_prices_keys: draft.ticket_prices ? Object.keys(draft.ticket_prices) : [],
    });

    const missingFields: string[] = [];
    if (!draft.name) missingFields.push('name');
    if (!draft.category) missingFields.push('category');
    if (!draft.event_date) missingFields.push('event date');
    if (!draft.venue_name && !draft.venue_id) missingFields.push('venue');
    if (!draft.ticket_prices || Object.keys(draft.ticket_prices).length === 0) missingFields.push('ticket prices');

    if (missingFields.length > 0) {
      alert(`Cannot submit: Missing ${missingFields.join(', ')}. Please edit the draft first.`);
      return;
    }

    if (!confirm('Submit this event for review? You won\'t be able to delete it after submission.')) {
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/v1/promoter/events/draft/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit_for_review: true }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit');
      }

      alert('Draft submitted for review! You\'ll be notified when it\'s approved.');
      if (onDraftUpdate) onDraftUpdate();
    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      console.log('Deleting draft:', draft.id, draft.name, 'status:', draft.status);

      const response = await fetch(`/api/v1/promoter/events/draft/${draft.id}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);

      const responseText = await response.text();
      console.log('Delete response body:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.slice(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Delete failed (${response.status})`);
      }

      console.log('Delete successful, refreshing drafts...');
      if (onDraftUpdate) onDraftUpdate(draft.id);
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete draft');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cat.icon}</span>
          <span className="text-xs font-label text-[#59FFA0] uppercase tracking-wider">
            {cat.label}
          </span>
        </div>
        <StatusBadge status={draft.status} />
      </div>

      <h3 className="font-slab-serif text-lg font-bold text-white mb-2 line-clamp-1">
        {draft.name}
      </h3>

      <div className="space-y-1.5 text-sm text-[#7DD8E8] mb-3">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>{eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="text-[#7DD8E8]">•</span>
          <span>{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
        {draft.venue_name && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="line-clamp-1">{draft.venue_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span>🎫</span>
          <span>{draft.total_tickets} tickets • {ticketTypeCount} type{ticketTypeCount !== 1 ? 's' : ''} • from ${minPrice.toFixed(2)}</span>
        </div>
      </div>

      {draft.status === 'draft' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              disabled={isSubmitting || isDeleting}
              className="flex-1 px-3 py-2 bg-[#59FFA0]/10 text-[#59FFA0] rounded-lg text-sm font-medium hover:bg-[#59FFA0]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isDeleting}
              className="px-3 py-2 bg-white/5 text-white rounded-lg text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Submitting...</span>
                </>
              ) : (
                'Submit for Review'
              )}
            </button>
          </div>
          <button
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
            className="w-full px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-500/20"
          >
            {isDeleting ? (
              <>
                <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Deleting...</span>
              </>
            ) : (
              'Delete Draft'
            )}
          </button>
        </div>
      )}

      {draft.status === 'rejected' && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-300">Contact support for details about rejection.</p>
        </div>
      )}
    </div>
  );
}
