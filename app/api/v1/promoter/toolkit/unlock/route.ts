import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createAnonClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createAnonClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { feature_id, unlock_type } = body as {
      feature_id: string;
      unlock_type: 'purchased' | 'subscription';
    };

    if (!feature_id || !unlock_type) {
      return NextResponse.json(
        { success: false, error: 'feature_id and unlock_type are required' },
        { status: 400 }
      );
    }

    if (unlock_type !== 'purchased' && unlock_type !== 'subscription') {
      return NextResponse.json(
        { success: false, error: 'unlock_type must be "purchased" or "subscription"' },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data: promoter, error: promoterError } = await admin
      .from('promoters')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (promoterError) {
      console.error('[toolkit/unlock] promoter lookup error:', promoterError);
      return NextResponse.json({ success: false, error: 'Failed to fetch promoter' }, { status: 500 });
    }

    if (!promoter) {
      return NextResponse.json({ success: false, error: 'Promoter not found' }, { status: 404 });
    }

    const { data: feature, error: featureError } = await admin
      .from('toolkit_features')
      .select('id, name, description, price_one_time, price_monthly, is_active')
      .eq('id', feature_id)
      .eq('is_active', true)
      .maybeSingle();

    if (featureError) {
      console.error('[toolkit/unlock] feature lookup error:', featureError);
      return NextResponse.json({ success: false, error: 'Failed to fetch feature' }, { status: 500 });
    }

    if (!feature) {
      return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 });
    }

    const { data: existing, error: existingError } = await admin
      .from('promoter_features')
      .select('id')
      .eq('promoter_id', promoter.id)
      .eq('feature_id', feature_id)
      .maybeSingle();

    if (existingError) {
      console.error('[toolkit/unlock] existing check error:', existingError);
      return NextResponse.json({ success: false, error: 'Failed to check existing unlock' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Feature already unlocked' },
        { status: 409 }
      );
    }

    const price =
      unlock_type === 'purchased' ? feature.price_one_time : feature.price_monthly;

    if (price == null || price <= 0) {
      return NextResponse.json(
        { success: false, error: `No ${unlock_type === 'purchased' ? 'one-time' : 'monthly'} price configured for this feature` },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const sessionParams: Stripe.Checkout.SessionCreateParams =
      unlock_type === 'purchased'
        ? {
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: feature.name,
                    description: feature.description || undefined,
                  },
                  unit_amount: Math.round(price * 100),
                },
                quantity: 1,
              },
            ],
            success_url: `${baseUrl}/promoter/dashboard?unlocked=${feature_id}`,
            cancel_url: `${baseUrl}/promoter/dashboard`,
            customer_email: user.email,
            metadata: {
              type: 'toolkit_unlock',
              feature_id,
              promoter_id: promoter.id,
              unlock_type,
            },
          }
        : {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: feature.name,
                    description: feature.description || undefined,
                  },
                  unit_amount: Math.round(price * 100),
                  recurring: { interval: 'month' },
                },
                quantity: 1,
              },
            ],
            success_url: `${baseUrl}/promoter/dashboard?unlocked=${feature_id}`,
            cancel_url: `${baseUrl}/promoter/dashboard`,
            customer_email: user.email,
            subscription_data: {
              metadata: {
                type: 'toolkit_unlock',
                feature_id,
                promoter_id: promoter.id,
                unlock_type,
              },
            },
            metadata: {
              type: 'toolkit_unlock',
              feature_id,
              promoter_id: promoter.id,
              unlock_type,
            },
          };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      success: true,
      data: { checkout_url: session.url },
    });
  } catch (error: any) {
    console.error('[toolkit/unlock] unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
