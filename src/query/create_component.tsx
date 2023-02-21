import React, { FunctionComponent, ReactNode } from 'react';
import { createAccessor } from './create_accessor';
import {
  AccessorQueryCacheStore,
  AccessorQueryConfiguration,
  AccessorQueryResult,
} from './types';
import { useQuery } from './use_query';

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
  Data,
>(
  configuration: AccessorQueryConfiguration<
    Cache,
    QueryRequest,
    QueryResponse,
    Data
  >,
): FunctionComponent<Props<Cache, QueryRequest, Data>> => {
  // Accessor.
  const accessor = createAccessor(configuration);

  // Component.
  return ({ children, cache, args }) => {
    const accessorResult = useQuery(accessor, cache, args);

    return <>{children(accessorResult)}</>;
  };
};
