// GET /api/v1/users/me/staff-access
// Display only: tells the site menus whether to show the Requests link. Every request route and the
// staff layout keep their own server-side checks, so this answer grants nothing.
// It never errors: signed out, not staff, a database error or anything unexpected all answer
// { can_view: false } with status 200, so nothing about the failure or the caller is revealed.
// The answer is per user, so it is never cached.

import { getStaffAccess } from '@/lib/staff-auth'
import { okNoStore } from '@/lib/request-inbox-api'

export async function GET() {
  let canView = false
  try {
    canView = (await getStaffAccess()).state === 'allowed'
  } catch {
    canView = false
  }
  return okNoStore({ can_view: canView })
}
