import { ConfigurationQuery } from './types';
import { useQuery } from './use_query';

/*
 * Create a query hook.
 *
 * Please refer to the `useQuery` hook for more details.
 */
export const createHook = <TQueryRequest, TQueryResponse, TData>(
  configuration: ConfigurationQuery<TQueryRequest, TQueryResponse, TData>,
) => {
  return (args: TQueryRequest) => {
    return useQuery<TQueryRequest, TQueryResponse, TData>(configuration, args);
  };
};
