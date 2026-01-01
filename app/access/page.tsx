import { redirect } from 'next/navigation';
import { enhancedTokenService } from '@/lib/services/enhanced-token.service';
import { tokenAliasService } from '@/lib/services/token-alias.service';
import { looksLikeAlias } from '@/lib/utils/token-alias';

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = 'force-dynamic';

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

export default async function AccessPage(props: any) {
  const maybePromise = props?.searchParams as
    | Promise<SearchParams>
    | SearchParams
    | undefined;
  const resolvedParams: SearchParams =
    maybePromise && typeof (maybePromise as any).then === 'function'
      ? await (maybePromise as Promise<SearchParams>)
      : ((maybePromise as SearchParams) ?? {});
  const aliasParam = resolvedParams.alias;
  const tokenParam = resolvedParams.token;

  const initialCode =
    (Array.isArray(aliasParam) ? aliasParam[0] : aliasParam) ??
    (Array.isArray(tokenParam) ? tokenParam[0] : tokenParam) ??
    '';

  if (initialCode) {
    const trimmed = String(initialCode).trim();
    if (trimmed) {
      try {
        let resolvedToken = trimmed;
        if (looksLikeAlias(trimmed)) {
          const aliasRecord = await tokenAliasService.findByAlias(trimmed);
          if (aliasRecord?.token?.token) {
            resolvedToken = aliasRecord.token.token;
          }
        }

        const validation = await enhancedTokenService.validateToken(
          resolvedToken
        );
        if (validation.isValid && validation.token?.token) {
          redirect(buildRedirectUrl(validation.token.token, resolvedParams));
        }
      } catch (error) {
        console.warn('[AccessPage] No se pudo redirigir desde /access', error);
      }
    }
  }

  redirect(buildRedirectUrl('invalid-access', resolvedParams));
}
