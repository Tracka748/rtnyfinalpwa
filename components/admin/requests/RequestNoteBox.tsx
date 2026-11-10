'use client'

// PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { CallResult } from '@/lib/request-lifecycle-client'
import { NOTE_MAX } from '@/lib/request-limits'
import { checkNote } from '@/lib/request-lifecycle-ui'

interface Props {
  busy: boolean
  /** Sends the note. The page disables everything while it runs, which also stops a double submit. */
  onSubmit: (note: string) => Promise<CallResult>
}

export function RequestNoteBox({ busy, onSubmit }: Props) {
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const check = checkNote(text)

  async function submit() {
    if (busy || check.error || !check.value) return
    setMessage(null)
    const result = await onSubmit(check.value)
    if (result.ok) setText('')
    else setMessage(result.message) // keep the text so nothing is lost
  }

  return (
    <div>
      <label htmlFor="request-note" className="block text-sm text-[#7DD8E8]">Add a note</label>
      <Textarea
        id="request-note"
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={busy}
        rows={4}
        aria-describedby="request-note-count"
        className="mt-1 min-h-[7rem] bg-[#121113] text-white"
      />
      <div className="mt-1 flex items-center justify-between gap-3">
        <p id="request-note-count" className={`text-xs ${check.count > NOTE_MAX ? 'text-red-400' : 'text-[#7DD8E8]'}`}>{check.count}/{NOTE_MAX}</p>
        <Button type="button" disabled={busy || !!check.error || !check.value} onClick={submit} aria-busy={busy} className="min-h-[44px] h-11 bg-[#59FFA0] px-5 font-semibold text-black hover:bg-[#59FFA0]/90">
          {busy ? 'Working…' : 'Add note'}
        </Button>
      </div>
      {message && <p role="alert" className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{message}</p>}
    </div>
  )
}
