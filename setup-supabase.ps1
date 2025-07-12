# Supabase setup script

# Get Supabase credentials
$supabaseUrl = Read-Host "Enter your Supabase URL (e.g., https://your-project.supabase.co)"
$supabaseKey = Read-Host "Enter your Supabase API Key"

# Set environment variables
$env:SUPABASE_URL = $supabaseUrl
$env:SUPABASE_ANON_KEY = $supabaseKey

# Run Supabase commands
Write-Host "Initializing Supabase project..."
npx supabase init

Write-Host "Linking to Supabase project..."
npx supabase link --project-ref tkqshkaojqirxshizoqs

Write-Host "Pushing migrations..."
npx supabase db push

Write-Host "Generating TypeScript types..."
npx supabase gen types typescript --local > frontend/types/database.ts

Write-Host "Setup complete!"
