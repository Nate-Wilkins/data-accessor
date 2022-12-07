import React, { FunctionComponent, ReactNode } from 'react';
import { createHook } from './create';
import {
  AccessorCacheStore,
  AccessorConfiguration,
  AccessorQueryResult,
} from './types';

type Props<Cache, QueryRequest, Data> = {
  cache: () => Cache;
  args: QueryRequest;
  children: (result: AccessorQueryResult<Data>) => ReactNode;
};

/*
 * Create an accessor component.
 *
 * These types of function factories are often referred to as high level order components (HOC).
 *
 * Please refer to the `createHook` function for more details.
 */
export const createComponent = <
  Cache extends AccessorCacheStore,
  QueryRequest,
  QueryResponse,
  Data
>(
  configuration: AccessorConfiguration<
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
