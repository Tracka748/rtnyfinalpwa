'use client'

import { FOCUS_RING, SECONDARY, TAP } from '@/components/admin/requests/ui'
import { canEditAlias, needsAliasFlag } from '@/lib/admin-alias-ui'

interface Props {
  name: string
  alias?: string | null
  isSpecial?: boolean
  onEdit: () => void
  /** Phone layout (under the name): render nothing when there is nothing to show. */
  compact?: boolean
}

// A user's @alias, an amber "No alias" badge for a special user without one, and an edit button.
export function AliasCell({ name, alias, isSpecial, onEdit, compact = false }: Props) {
  const fields = { alias, is_special: isSpecial }
  const editable = canEditAlias(fields)
  if (compact && !editable) return null

  return (
    <div className="flex flex-wrap items-center gap-x-2">
      {alias ? (
        <span className={`${SECONDARY} font-medium text-[#F9FDFF] break-all`}>@{alias}</span>
      ) : needsAliasFlag(fields) ? (
        <span className={`inline-flex items-center px-2 py-0.5 rounded ${SECONDARY} font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30`}>
          No alias
        </span>
      ) : (
        <span className={`${SECONDARY} text-[#7DD8E8]`}>—</span>
      )}
      {editable && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${alias ? 'Edit' : 'Add'} alias for ${name}`}
          className={`${TAP} min-w-[44px] px-2 touch-manipulation rounded ${SECONDARY} font-medium text-[#1AC8ED] hover:underline ${FOCUS_RING}`}
        >
          {alias ? 'Edit' : 'Add'}
        </button>
      )}
    </div>
  )
}
