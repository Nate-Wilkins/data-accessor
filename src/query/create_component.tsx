import React, { FunctionComponent, ReactNode } from 'react';
import { CacheResult, ConfigurationQuery, QueryRequestResponse } from './types';
import { useQuery } from './use_query';

type Props<TQueryRequest, TQueryRequestResponse, TData> = {
  args: TQueryRequest;
  children: (args: {
    data: TData;
    cache: { invalidate: () => Promise<CacheResult<TData>> };
    queryMore:
      | (() => Promise<QueryRequestResponse<TQueryRequestResponse> | null>)
      | null;
  }) => ReactNode;
};

/*
 * Create a query component.
 *
 * These types of function factories are often referred to as high level order components (HOC).
 *
 * Please refer to the `useQuery` hook for more details.
 */
export const createComponent = <TQueryRequest, TQueryRequestResponse, TData>(
  configuration: ConfigurationQuery<
    TQueryRequest,
    TQueryRequestResponse,
    TData
  >,
): FunctionComponent<Props<TQueryRequest, TQueryRequestResponse, TData>> => {
  // Component.
  const Component: FunctionComponent<
    Props<TQueryRequest, TQueryRequestResponse, TData>
  > = ({ children, args }) => {
    const result = useQuery<TQueryRequest, TQueryRequestResponse, TData>(
      configuration,
      args,
    );

    return <>{children(result)}</>;
  };

  // NOTE: To create a HOC like this we need to explicitly define a function component.
  //       This avoids the whole "Invalid hook call" error.
  return Component;
};
