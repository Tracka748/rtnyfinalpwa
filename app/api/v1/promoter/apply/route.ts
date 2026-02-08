// app/api/v1/promoter/apply/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  console.log('[Promoter Apply] Starting application submission...');

  try {
    // Create Supabase client (async in Next.js 15)
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[Promoter Apply] Auth check:', { userId: user?.id, authError: authError?.message });

    if (authError || !user) {
      console.log('[Promoter Apply] Unauthorized - no user session');
      return NextResponse.json(
        { success: false, error: 'You must be logged in to apply as a promoter' },
        { status: 401 }
      );
    }

    // Get form data
    const body = await req.json();
    console.log('[Promoter Apply] Form data received:', body);

    const {
      business_name,
      contact_email,
      phone,
      website,
      instagram_handle,
      description,
      expected_events_per_month,
    } = body;

    // Validate required fields
    if (!business_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Business name is required' },
        { status: 400 }
      );
    }

    if (!contact_email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Contact email is required' },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    // Check if user already has a pending application
    const { data: existingApp, error: existingError } = await supabase
      .from('promoter_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    console.log('[Promoter Apply] Existing app check:', { existingApp, existingError: existingError?.message });

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      // Check if table doesn't exist
      if (existingError.message?.includes('does not exist')) {
        console.error('[Promoter Apply] Table does not exist:', existingError);
        return NextResponse.json(
          { success: false, error: 'Application system not yet configured. Please contact support.' },
          { status: 500 }
        );
      }
      throw existingError;
    }

    if (existingApp) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending application. We will review it soon!' },
        { status: 400 }
      );
    }

    // Check if user is already a promoter (via promoters table)
    const { data: existingPromoter } = await supabase
      .from('promoters')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingPromoter) {
      return NextResponse.json(
        { success: false, error: 'You are already registered as a promoter!' },
        { status: 400 }
      );
    }

    // Create application
    const applicationData = {
      user_id: user.id,
      business_name: business_name.trim(),
      contact_email: contact_email.trim(),
      phone: phone?.trim() || null,
      website: website?.trim() || null,
      instagram_handle: instagram_handle?.trim() || null,
      description: description.trim(),
      expected_events_per_month: expected_events_per_month || 1,
      status: 'pending',
    };

    console.log('[Promoter Apply] Inserting application:', applicationData);

    const { data: application, error: insertError } = await supabase
      .from('promoter_applications')
      .insert(applicationData)
      .select()
      .single();

    if (insertError) {
      console.error('[Promoter Apply] Insert error:', insertError);

      // Handle specific errors
      if (insertError.message?.includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Application system not yet configured. Please contact support.' },
          { status: 500 }
        );
      }

      throw insertError;
    }

    console.log('[Promoter Apply] Application created successfully:', application);

    return NextResponse.json({
      success: true,
      data: application,
      message: 'Application submitted successfully!'
    });

  } catch (error: any) {
    console.error('[Promoter Apply] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit application. Please try again.'
      },
      { status: 500 }
    );
  }
}
