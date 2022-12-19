import React, { FunctionComponent, ReactNode } from 'react';
import { createHook } from './create_hook';
import {
  AccessorQueryCacheStore,
  AccessorQueryConfiguration,
  AccessorQueryResult,
} from './types';

type Props<Cache, QueryRequest, Data> = {
  cache: () => Cache;
  args: QueryRequest;
  children: (result: AccessorQueryResult<Data>) => ReactNode;
};

/*
 * Create an accessor query component.
 *
 * These types of function factories are often referred to as high level order components (HOC).
 *
 * Please refer to the `createHook` function for more details.
 */
export const createComponent = <
  Cache extends AccessorQueryCacheStore,
  QueryRequest,
  QueryResponse,
  Data
>(
  configuration: AccessorQueryConfiguration<
    Cache,
    QueryRequest,
    QueryResponse,
    Data
  >,
): FunctionComponent<Props<Cache, QueryRequest, Data>> => {
  // Accessor.
  const useAccessor = createHook(configuration);

  // Component.
  return ({ children, cache, args }) => {
    const accessorResult = useAccessor(cache, args);

    return <>{children(accessorResult)}</>;
  };
};
