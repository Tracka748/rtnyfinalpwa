// Text limits for request lifecycle input, shared by the routes (server) and the admin UI (browser).
// Pure: no server-only imports. They match the database: request_activity.reason is capped at 500
// characters and note at 2000.

export const REASON_MAX = 500
export const NOTE_MAX = 2000

/** Characters as Postgres counts them (code points), not UTF-16 units. */
export const countChars = (text: string): number => Array.from(text).length
