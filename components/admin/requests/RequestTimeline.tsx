'use client'

import {
  REDACTED_NOTICE, TIMELINE_LIMIT, activityLabel, describeChange, personName, timelineDetail, timelineTruncated,
  type ActivityEntry,
} from '@/lib/request-lifecycle-ui'
import { CARD_BORDER, PROSE } from '@/components/admin/requests/ui'

/** Oldest first. Every value is rendered as React text; reason and note keep their line breaks with CSS only. */
export function RequestTimeline({ entries, redacted }: { entries: ActivityEntry[]; redacted: boolean }) {
  if (entries.length === 0) return <p className="text-base leading-6 text-[#7DD8E8]">No activity yet.</p>
  return (
    <div>
      {timelineTruncated(entries.length) && (
        <p className="mb-3 text-sm leading-5 text-[#7DD8E8]">Only the latest {TIMELINE_LIMIT} entries are shown.</p>
      )}
      <ol className="space-y-5">
        {entries.map(e => {
          const detail = timelineDetail(e, redacted)
          const changes = describeChange(e)
          return (
            <li key={e.id} className={`border-l-2 ${CARD_BORDER} pl-4`}>
              <p className="break-words text-base font-medium leading-6 text-white">
                {activityLabel(e.action)} <span className="font-normal text-[#7DD8E8]">by {personName(e.actor)}</span>
              </p>
              <time className="block text-sm leading-5 text-[#7DD8E8]" dateTime={e.created_at}>{new Date(e.created_at).toLocaleString()}</time>
              {changes.map(c => <p key={c} className="mt-1 break-words text-base leading-6 text-white/80">{c}</p>)}
              {detail.kind === 'text' && (
                <div className={`mt-2 space-y-2 ${PROSE} text-base leading-6 text-white`}>
                  {detail.reason && <p className="whitespace-pre-wrap break-words"><span className="text-[#7DD8E8]">Reason: </span>{detail.reason}</p>}
                  {detail.note && <p className="whitespace-pre-wrap break-words"><span className="text-[#7DD8E8]">Note: </span>{detail.note}</p>}
                </div>
              )}
              {detail.kind === 'redacted' && <p className="mt-2 text-sm italic leading-5 text-[#7DD8E8]">{REDACTED_NOTICE}</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
