import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');

  console.log('[Payment Pending] Received callback:', {
    paymentId,
    status,
    externalReference,
  });

  // Redirect to a pending page with the payment information
  const redirectUrl = new URL('/f/payment-pending', request.url);
  if (paymentId) redirectUrl.searchParams.set('payment_id', paymentId);
  if (status) redirectUrl.searchParams.set('status', status);
  if (externalReference)
    redirectUrl.searchParams.set('order_id', externalReference);

  return NextResponse.redirect(redirectUrl);
}
