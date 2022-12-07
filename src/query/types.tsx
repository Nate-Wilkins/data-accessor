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
  cacheDuration: number;
  cacheId: (args: { args: QueryRequest }) => string;
  cacheSet: (args: {
    cache: () => Cache;
    cacheId: string;
    args: QueryRequest;
    request: (args: QueryRequest) => Promise<AccessorQueryResult<Data>>;
    response: { status: number; data: QueryResponse };
  }) => { data: Data };
  cacheGet: (args: {
    cache: () => Cache;
    cacheId: string;
    args: QueryRequest;
    request: (args: QueryRequest) => Promise<AccessorQueryResult<Data>>;
  }) => AccessorQueryResult<Data> | null;
  cacheIsPrimableFromCache: boolean;
  debug?: boolean;
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
