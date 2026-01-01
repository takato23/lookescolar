import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PublicStoreConfigSchema = z.object({
  token: z.string().min(1),
  password: z.string().optional(),
});

const DEPRECATION_HEADERS = {
  Warning: '299 - "Deprecated: use /api/store/[token]"',
  Deprecation: 'true',
};

function buildProxyHeaders(request: NextRequest, password?: string) {
  const headers = new Headers();
  const forwarded = ['x-tenant-id', 'x-forwarded-for', 'x-real-ip', 'user-agent'];
  forwarded.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });
  if (password) {
    headers.set('X-Store-Password', password);
  }
  headers.set('Content-Type', 'application/json');
  return headers;
}

async function fetchUnifiedStore(
  request: NextRequest,
  token: string,
  password?: string
) {
  const url = new URL(`/api/store/${token}`, request.nextUrl.origin);
  url.searchParams.set('include_assets', 'false');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildProxyHeaders(request, password),
    cache: 'no-store',
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, data };
}

function buildAvailabilityPayload(data: any) {
  return {
    available: data?.available ?? true,
    passwordRequired: Boolean(data?.passwordRequired ?? data?.passwordProtected),
    schedule: data?.schedule,
    template: data?.settings?.template,
    brand_name: data?.settings?.custom_branding?.brand_name || 'LookEscolar',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = PublicStoreConfigSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.issues,
        },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    const { token, password } = validationResult.data;
    const { response, data } = await fetchUnifiedStore(request, token, password);

    if (!response.ok) {
      return NextResponse.json(data || { error: 'Request failed' }, {
        status: response.status,
        headers: DEPRECATION_HEADERS,
      });
    }

    return NextResponse.json(
      {
        success: true,
        settings: data?.settings ?? null,
        storeUrl: `/store-unified/${token}`,
        mercadoPagoConnected: data?.mercadoPagoConnected ?? true,
        available: data?.available ?? true,
        schedule: data?.schedule,
        passwordProtected: Boolean(data?.passwordProtected),
      },
      { headers: DEPRECATION_HEADERS }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/public/store/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: DEPRECATION_HEADERS }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    const { response, data } = await fetchUnifiedStore(request, token);

    if (response.ok) {
      return NextResponse.json(buildAvailabilityPayload(data), {
        headers: DEPRECATION_HEADERS,
      });
    }

    if (response.status === 401 && data?.passwordRequired) {
      return NextResponse.json(buildAvailabilityPayload(data), {
        headers: DEPRECATION_HEADERS,
      });
    }

    if (response.status === 403 && data?.available === false) {
      return NextResponse.json(
        {
          ...buildAvailabilityPayload(data),
          available: false,
        },
        { headers: DEPRECATION_HEADERS }
      );
    }

    return NextResponse.json(data || { error: 'Request failed' }, {
      status: response.status,
      headers: DEPRECATION_HEADERS,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/public/store/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: DEPRECATION_HEADERS }
    );
  }
}
