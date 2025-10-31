import { FamilyAccessCard } from '@/components/ui/family-access-card';

type SearchParams = Record<string, string | string[] | undefined>;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 px-6 py-16 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Recuperá tu galería familiar
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Si escaneaste un código QR o ingresaste desde un enlace directo,
            confirmamos el acceso automáticamente.
          </p>
        </div>

        <FamilyAccessCard
          initialCode={initialCode}
          autoResolve={Boolean(initialCode)}
        />
      </div>
    </div>
  );
}
