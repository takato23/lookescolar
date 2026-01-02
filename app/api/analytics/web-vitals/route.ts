import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  // Simple endpoint to satisfy the Web Vitals tracker
  // In a real app, you would process or store these metrics
  return NextResponse.json({ success: true });
}
