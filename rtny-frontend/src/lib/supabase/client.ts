import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uxpmfnbifhkayljayjtb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cG1mbmJpZmhrYXlsamF5anRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NjczOTgsImV4cCI6MjA2MjU0MzM5OH0.mngD4iOJ5e39sZ9U7N753Q2xfYcFiDWmqbGP1iF3ORk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Track': 'component-library'
    }
  }
})

// Export the database helpers
export { db } from './db'

export const supabaseClient = supabase
