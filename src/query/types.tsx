export type ConfigurationQuery<TQueryRequest, TQueryRequestResponse, TData> = {
  debug?: number;

  cache: {
    limit?: number;

    ttl: number;

    isPrimable?: boolean;

    id: (args: { args: TQueryRequest }) => string;

    invalidate?: {
      auto?: {
        enable: boolean;
        ttl?: number;
        // TODO: showLoading?: boolean;
      };
    };

    set: CacheSet<TQueryRequest, TQueryRequestResponse, TData>;

    get: CacheGet<TQueryRequest, TData>;

    clear: CacheClear<TQueryRequest>;

    data: {
      get: (k: string) => () => TData | null | undefined;
      set: (k: string, v: null | undefined | (() => TData)) => void;
    };
  };

  suspense?: {
    cache: {
      get: (k: string) => (() => CacheResult<TData>) | null | undefined;
      set: (
        k: string,
        v: null | undefined | (() => CacheResult<TData>),
      ) => void;
    };
  };

  queryRequest: (
    args: TQueryRequest,
  ) => Promise<QueryRequestResponse<TQueryRequestResponse>>;

  queryRequestMore?: (args: {
    args: TQueryRequest;
    data: TData;
  }) => () => Promise<null | QueryRequestResponse<TQueryRequestResponse>>;
};

export type CacheResult<TData> = {
  data: TData;
};

export type CacheSet<TQueryRequest, TQueryRequestResponse, TData> = (args: {
  args: TQueryRequest;
  response: { status: number; data: TQueryRequestResponse };
}) => { data: TData };

export type CacheGet<TQueryRequest, TData> = (args: {
  args: TQueryRequest;
}) => CacheResult<TData> | null;

export type CacheClear<TQueryRequest> = (args: { args: TQueryRequest }) => void;

export type QueryRequestResponse<T> = {
  status: number;
  data?: null | T;
  error?: string;
};
