export type FetchMore<T> = () => Promise<AccessorQueryResult<T>>;

export type AccessorQueryCacheStoreSet<T> = {
  (store: T): void;
};

export type AccessorQueryCacheStore = {
  dataAccess: {
    set: (store: AccessorQueryCacheStoreSet<AccessorQueryCacheStore>) => any;
    query: Map<
      string,
      | {
          cacheTimeToRefresh: number;
          promise: null | Promise<AccessorQueryResult<any>>;
        }
      | Error
    >;
    suspense: Map<string, () => AccessorQueryResult<any>>;
  };
};

export type AccessorQueryConfiguration<
  TCache,
  TQueryRequest,
  TQueryResponse,
  TData
> = {
  debug?: boolean;
  cache: {
    duration: number;
    id: (args: { args: TQueryRequest }) => string;
    set: (args: {
      cache: () => TCache;
      cacheId: string;
      args: TQueryRequest;
      request: (args: TQueryRequest) => Promise<AccessorQueryResult<TData>>;
      response: { status: number; data: TQueryResponse };
    }) => { data: TData };
    get: (args: {
      cache: () => TCache;
      cacheId: string;
      args: TQueryRequest;
      request: (args: TQueryRequest) => Promise<AccessorQueryResult<TData>>;
    }) => AccessorQueryResult<TData> | null;
    isPrimableFromCache: boolean;
  };
  constraints?: {
    enforce?: boolean;
    maxDelay?: number;
  };
  query: (
    args: TQueryRequest,
  ) => Promise<AccessorQueryRequestResponse<TQueryResponse>>;
};

export type AccessorQueryResult<T> = {
  data: null | T;
  fetchMore?: null | FetchMore<T>;
};

export type AccessorQueryRequestResponse<T> = {
  status: number;
  data?: null | T;
  error?: string;
};

export class ErrorTimedOut extends Error {
  constructor(queryName: string, cacheId: string) {
    super(`Data accessor '${queryName}' with id '${cacheId}' timed out.`);
  }
}
