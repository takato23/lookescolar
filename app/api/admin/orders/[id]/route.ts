import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id });
}

export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id, ok: true });
}

export async function PUT(_request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id, ok: true });
}


