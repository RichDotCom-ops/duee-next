/**
 * POST /api/checkout
 * Creates a Lemon Squeezy checkout and returns the checkout URL.
 *
 * Required env vars:
 *   LEMONSQUEEZY_API_KEY
 *   LEMONSQUEEZY_STORE_ID
 *   LEMONSQUEEZY_WEEKLY_VARIANT_ID
 *   LEMONSQUEEZY_MONTHLY_VARIANT_ID
 *
 * Body: { plan: 'weekly' | 'monthly', userId: string, userEmail: string }
 */
export async function POST(request) {
  try {
    const { plan, userId, userEmail } = await request.json();

    const apiKey  = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = plan === 'weekly'
      ? process.env.LEMONSQUEEZY_WEEKLY_VARIANT_ID
      : process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID;

    if (!apiKey || !storeId || !variantId) {
      return Response.json({ error: 'Payment not configured yet.' }, { status: 503 });
    }

    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            custom: { user_id: userId, user_email: userEmail },
          },
          checkout_options: { embed: false },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://duee.online'}/dashboard?pro=1`,
          },
        },
        relationships: {
          store:   { data: { type: 'stores',   id: String(storeId)   } },
          variant: { data: { type: 'variants',  id: String(variantId) } },
        },
      },
    };

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept':        'application/vnd.api+json',
        'Content-Type':  'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('LS checkout error:', data);
      return Response.json({ error: 'Could not create checkout. Try again.' }, { status: 502 });
    }

    const checkoutUrl = data.data?.attributes?.url;
    return Response.json({ url: checkoutUrl });
  } catch (err) {
    console.error('Checkout route error:', err);
    return Response.json({ error: 'Server error.' }, { status: 500 });
  }
}
