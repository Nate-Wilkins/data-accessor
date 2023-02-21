export type AccessorQueryResultFetchMore<T> = () => Promise<
  AccessorQueryResult<T>
>;
export type AccessorQueryResultClear = () => void;
export type AccessorQueryResultInvalidate = () => void;

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
          promise: null | Promise<AccessorQueryResultCacheSetResult<any>>;
        }
      | Error
    >;
    suspense: Map<string, () => AccessorQueryResultCacheSetResult<any>>;
  };
};

export type AccessorQueryConfiguration<
  TCache,
  TQueryRequest,
  TQueryResponse,
  TData,
> = {
  debug?: boolean;
  cache: {
    duration: number;

    isPrimableFromCache: boolean;

    id: (args: { args: TQueryRequest }) => string;

    set: (args: {
      cache: () => TCache;
      cacheId: string;
      args: TQueryRequest;
      request: (
        args: TQueryRequest,
      ) => Promise<AccessorQueryResultCacheSetResult<TData>>;
      response: { status: number; data: TQueryResponse };
    }) => { data: TData };

    get: (args: {
      cache: () => TCache;
      cacheId: string;
      args: TQueryRequest;
      request: (
        args: TQueryRequest,
      ) => Promise<AccessorQueryResultCacheSetResult<TData>>;
    }) => AccessorQueryResultCacheSetResult<TData> | null;

    clear: (args: {
      cache: () => TCache;
      cacheId: string;
      args: TQueryRequest;
    }) => void;
  };
  constraints?: {
    enforce?: boolean;
    maxDelay?: number;
  };
  query: (
    args: TQueryRequest,
  ) => Promise<AccessorQueryRequestResponse<TQueryResponse>>;
};

export type AccessorQueryContext<TCache, TQueryRequest, TQueryResponse, TData> =
  {
    queryName: string;
    requestQueryPromise: (
      getCacheStore: () => TCache,
      args: TQueryRequest,
    ) => Promise<AccessorQueryResultCacheSetResult<TData>>;
    suspenseRequestQuery: ({
      getCacheStore,
      onDone,
      args,
    }: {
      getCacheStore: () => TCache;
      onDone?: () => void;
      args: TQueryRequest;
    }) => () => AccessorQueryResultCacheSetResult<TData>;
  };

export type AccessorQueryResultCacheSetResult<TData> = {
  data: null | TData;
  fetchMore?: null | AccessorQueryResultFetchMore<TData>;
};

export type AccessorQueryResult<TData> = {
  // Data from the accessor request.
  data: null | TData;

  // Prepopulated `request` for additional data from a `query`.
  fetchMore?: null | AccessorQueryResultFetchMore<TData>;

  // PrePopulated `clear` to remove a reqeust from the cache.
  // You might be looking for `invalidate`.
  clear: AccessorQueryResultClear;

  // PrePopulated `clear` **and** will invoke the accessor request again.
  invalidate: AccessorQueryResultInvalidate;
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
