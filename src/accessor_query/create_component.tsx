import React, { FunctionComponent, ReactNode } from 'react';
import { createHook } from './create';
import { AccessorQueryRequestResponse, AccessorQueryResult } from './types';

type Props<QueryRequest, Data> = {
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
export const createComponent = <QueryRequest, QueryResponse, Data>({
  cacheId,
  cacheSet,
  cacheGet,
  query,
}: {
  cacheId: (args: QueryRequest) => string;
  cacheSet: (args: {
    cacheId: string;
    args: QueryRequest;
    request: (args: QueryRequest) => Promise<AccessorQueryResult<Data>>;
    response: { status: number; data: QueryResponse };
  }) => { data: Data };
  cacheGet: (args: {
    cacheId: string;
    args: QueryRequest;
    request: (args: QueryRequest) => Promise<AccessorQueryResult<Data>>;
  }) => AccessorQueryResult<Data> | null;
  query: (
    args: QueryRequest,
  ) => Promise<AccessorQueryRequestResponse<QueryResponse>>;
}): FunctionComponent<Props<QueryRequest, Data>> => {
  // Accessor.
  const accessorQuery = createHook({
    cacheId,
    cacheSet,
    cacheGet,
    query,
  });

  // Component.
  return ({ children, args }) => {
    const accessorResult = accessorQuery(args);

    return <>{children(accessorResult)}</>;
  };
};
