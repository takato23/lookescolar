export type RouteContext<TParams> = {
  params: Promise<TParams>;
};

type MaybePromiseParams<TValue> = TValue extends { params: infer Params }
  ? Omit<TValue, 'params'> & {
      params: Params extends Promise<any> ? Params : Promise<Params>;
    }
  : TValue;

export type RouteArgs<TArgs extends any[]> = {
  [Index in keyof TArgs]: MaybePromiseParams<TArgs[Index]>;
};

export async function resolveParams<TParams>(
  context: RouteContext<TParams>
): Promise<TParams> {
  return context.params;
}
