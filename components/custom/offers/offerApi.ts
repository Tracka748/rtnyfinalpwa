import type { OfferRecord } from './types'

// Thin client for /api/v1/partners/[id]/offers, shared by the wizard and the list.

export type OfferAction = 'save' | 'submit' | 'approve' | 'request_changes' | 'deactivate'

export type OfferResult<T> = { ok: true; data: T } | { ok: false; status: number; error?: string }

async function request<T>(url: string, init?: RequestInit): Promise<OfferResult<T>> {
  try {
    const res = await fetch(url, init)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, status: res.status, error: typeof json.error === 'string' ? json.error : undefined }
    return { ok: true, data: json.data as T }
  } catch {
    // status 0 = network failure
    return { ok: false, status: 0 }
  }
}

function offerUrl(partnerId: string, offerId?: string) {
  const base = `/api/v1/partners/${partnerId}/offers`
  return offerId ? `${base}/${offerId}` : base
}

export function patchOffer(
  partnerId: string,
  offerId: string,
  body: { action: OfferAction } & Record<string, unknown>
): Promise<OfferResult<OfferRecord>> {
  return request<OfferRecord>(offerUrl(partnerId, offerId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function deleteOffer(partnerId: string, offerId: string): Promise<OfferResult<undefined>> {
  return request<undefined>(offerUrl(partnerId, offerId), { method: 'DELETE' })
}

export type MessageContext = 'load' | 'save' | 'submit' | 'delete' | 'review'

const FALLBACKS: Record<MessageContext, string> = {
  load: 'We couldn’t load this offer. Please try again.',
  save: 'Something went wrong saving your offer. Please try again.',
  submit: 'Something went wrong submitting your offer. Please try again.',
  delete: 'We couldn’t delete this offer. Please try again.',
  review: 'We couldn’t update this offer. Please try again.',
}

// Plain-language messages for the error banner.
export function messageForStatus(status: number, apiError: string | undefined, context: MessageContext): string {
  switch (status) {
    case 0:
      return 'We couldn’t reach the server. Check your connection and try again.'
    case 401:
      return 'Your session has expired. Sign in again to keep working on this offer.'
    case 403:
      return 'You don’t have access to this partner’s offers.'
    case 404:
      return 'We couldn’t find this offer. It may have been deleted.'
    case 409:
      return context === 'delete'
        ? 'Only drafts and offers that need changes can be deleted. Reload to see its latest status.'
        : 'This offer was changed somewhere else, or it can’t move to that status right now. Reload to get the latest version.'
    case 400:
      return apiError ?? 'Some details need another look.'
    default:
      return FALLBACKS[context]
  }
}
