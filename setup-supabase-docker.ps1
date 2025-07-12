# Supabase project reference
$PROJECT_REF = "tkqshkaojqirxshizoqs"

# Create types directory if it doesn't exist
if (-not (Test-Path "frontend/types")) {
    New-Item -ItemType Directory -Path "frontend/types" -Force
}

# Initialize Supabase project
Write-Host "Initializing Supabase project..."
docker run --rm -v ${PWD}:/supabase -w /supabase supabase/supabase init

# Login to Supabase (you'll need to enter your credentials)
docker run --rm -v ${PWD}:/supabase -w /supabase supabase/supabase login

# Link to your project
docker run --rm -v ${PWD}:/supabase -w /supabase supabase/supabase link --project-ref $PROJECT_REF

# Push migrations
docker run --rm -v ${PWD}:/supabase -w /supabase supabase/supabase db push

# Generate TypeScript types
docker run --rm -v ${PWD}:/supabase -w /supabase supabase/supabase gen types typescript --local | Out-File -Encoding UTF8 frontend/types/database.ts

Write-Host "Setup complete!"
