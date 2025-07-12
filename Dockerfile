FROM supabase/supabase

WORKDIR /supabase

# Copy the migrations directory
COPY supabase/migrations ./migrations

# Initialize Supabase
RUN supabase init

# Link to existing Supabase project (replace with your project ref)
RUN supabase link --project-ref your-project-ref
