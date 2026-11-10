'use client'

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

import {
  REDACTED_NOTICE, TIMELINE_LIMIT, activityLabel, describeChange, personName, timelineDetail, timelineTruncated,
  type ActivityEntry,
} from '@/lib/request-lifecycle-ui'

/** Oldest first. Every value is rendered as React text; reason and note keep their line breaks with CSS only. */
export function RequestTimeline({ entries, redacted }: { entries: ActivityEntry[]; redacted: boolean }) {
  if (entries.length === 0) return <p className="text-sm text-[#7DD8E8]">No activity yet.</p>
  return (
    <div>
      {timelineTruncated(entries.length) && (
        <p className="mb-3 text-xs text-[#7DD8E8]">Only the latest {TIMELINE_LIMIT} entries are shown.</p>
      )}
      <ol className="space-y-4">
        {entries.map(e => {
          const detail = timelineDetail(e, redacted)
          const changes = describeChange(e)
          return (
            <li key={e.id} className="border-l-2 border-white/10 pl-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-medium text-white">
                  {activityLabel(e.action)} <span className="font-normal text-[#7DD8E8]">by {personName(e.actor)}</span>
                </p>
                <time className="text-xs text-[#7DD8E8]" dateTime={e.created_at}>{new Date(e.created_at).toLocaleString()}</time>
              </div>
              {changes.map(c => <p key={c} className="text-sm text-white/80">{c}</p>)}
              {detail.kind === 'text' && (
                <div className="mt-1 space-y-1 text-sm text-white">
                  {detail.reason && <p className="whitespace-pre-wrap break-words"><span className="text-[#7DD8E8]">Reason: </span>{detail.reason}</p>}
                  {detail.note && <p className="whitespace-pre-wrap break-words"><span className="text-[#7DD8E8]">Note: </span>{detail.note}</p>}
                </div>
              )}
              {detail.kind === 'redacted' && <p className="mt-1 text-xs italic text-[#7DD8E8]">{REDACTED_NOTICE}</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
