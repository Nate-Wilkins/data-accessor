export type FetchMore<T> = () => Promise<AccessorQueryResult<T>>;

export type AccessorQueryCacheStoreSet<T> = {
  (store: T): void;
};

export type AccessorQueryCacheStore = {
  dataAccess: {
    set: (store: AccessorQueryCacheStoreSet<AccessorQueryCacheStore>) => any;
    query: Map<
      string,
      {
        cacheTimeToRefresh: number;
        promise: null | Promise<AccessorQueryResult<any>>;
      }
    >;
    suspense: Map<string, () => AccessorQueryResult<any>>;
  };
};

export type AccessorQueryConfiguration<
  Cache,
  QueryRequest,
  QueryResponse,
  Data
> = {
  debug?: boolean;
  cache: {
    duration: number;
    id: (args: { args: QueryRequest }) => string;
    set: (args: {
      cache: () => Cache;
      cacheId: string;
      args: QueryRequest;
      request: (args: QueryRequest) => Promise<AccessorQueryResult<Data>>;
      response: { status: number; data: QueryResponse };
    }) => { data: Data };
    get: (args: {
      cache: () => Cache;
      cacheId: string;
      args: QueryRequest;
      request: (args: QueryRequest) => Promise<AccessorQueryResult<Data>>;
    }) => AccessorQueryResult<Data> | null;
    isPrimableFromCache: boolean;
  };
  constraints: {
    enforce?: boolean;
    maxDelay?: number;
  };
  query: (
    args: QueryRequest,
  ) => Promise<AccessorQueryRequestResponse<QueryResponse>>;
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
    super(`Data accessor ${queryName} with id ${cacheId} timed out.`);
  }
}
