import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    order?: string;
    payment_id?: string;
  }>;
}

type SearchParams = Record<string, string | string[] | undefined>;

function buildRedirectUrl(token: string, searchParams: SearchParams) {
  const queryString = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => queryString.append(key, v));
    } else {
      queryString.append(key, value);
    }
  });

  const qs = queryString.toString();
  return qs ? `/store-unified/${token}?${qs}` : `/store-unified/${token}`;
}

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const resolvedSearchParams = await searchParams;

  redirect(buildRedirectUrl(token, resolvedSearchParams));
}
