import { createAccessor } from './create_accessor';
import { AccessorQueryCacheStore, AccessorQueryConfiguration } from './types';
import { useQuery } from './use_query';

/*
 * Create an accessor query hook.
 *
 * Please refer to the `useQuery` function for more details.
 */
export const createHook = <
  TCache extends AccessorQueryCacheStore,
  TQueryRequest,
  TQueryResponse,
  TData,
>(
  configuration: AccessorQueryConfiguration<
    TCache,
    TQueryRequest,
    TQueryResponse,
    TData
  >,
) => {
  const accessor = createAccessor(configuration);

  return (getCacheStore: () => TCache, args: TQueryRequest) => {
    return useQuery<TCache, TQueryRequest, TQueryResponse, TData>(
      accessor,
      getCacheStore,
      args,
    );
  };
};
