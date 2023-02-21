import { suspend } from '../suspend';
import {
  AccessorQueryCacheStore,
  AccessorQueryConfiguration,
  AccessorQueryContext,
  AccessorQueryResultCacheSetResult,
} from './types';

/**
 * Creates a query accessor.
 */
export const createAccessor = <
  TCache extends AccessorQueryCacheStore,
  TQueryRequest,
  TQueryResponse,
  TData,
>(
  configuration: AccessorQueryConfiguration<
    TCache,
    TQueryRequest,
    TQueryResponse,
    TData
  >,
): {
  configuration: AccessorQueryConfiguration<
    TCache,
    TQueryRequest,
    TQueryResponse,
    TData
  >;
  context: AccessorQueryContext<TCache, TQueryRequest, TQueryResponse, TData>;
} => {
  const { debug, cache, query } = configuration;
  const queryName = query.name;

  // Validate configuration.
  (() => {
    if (typeof debug !== 'boolean') {
      throw new Error('Invalid `debug` value. Must be a boolean.');
    }
    if (cache.duration <= 0) {
      throw new Error(
        'Invalid `cache.duration` value. Must be an integer greater than zero.',
      );
    }
    if (typeof cache.id !== 'function') {
      throw new Error('Invalid `cache.id` value. Must be a function.');
    }
    if (typeof cache.get !== 'function') {
      throw new Error('Invalid `cache.get` value. Must be a function.');
    }
    if (typeof cache.set !== 'function') {
      throw new Error('Invalid `cache.set` value. Must be a function.');
    }
    if (typeof cache.clear !== 'function') {
      throw new Error('Invalid `cache.clear` value. Must be a function.');
    }
    if (typeof cache.isPrimableFromCache !== 'boolean') {
      throw new Error(
        'Invalid `cache.isPrimableFromCache` value. Must be a boolean.',
      );
    }

    if (typeof query !== 'function') {
      throw new Error('Invalid `query` value. Must be a function.');
    }
  })();

  /*
   * Query promise.
   */
  const queryPromise = ({
    getCacheStore,
    cacheId,
    args,
  }: {
    getCacheStore: () => TCache;
    cacheId: string;
    args: TQueryRequest;
  }): Promise<AccessorQueryResultCacheSetResult<TData>> => {
    const state = { isQueryFinished: false };
    const promise: Promise<AccessorQueryResultCacheSetResult<TData>> =
      (async () => {
        // Execute query.
        const response = await query(args);
        state.isQueryFinished = true;

        // Handle query errors.
        if (response.status !== 200 || response.error || !response.data) {
          throw new Error(
            `(${response.status}) Response failed${
              response.error ? `: ${response.error}` : '.'
            }`,
          );
        }

        // Set query promise result cache.
        const cacheSetResult = cache.set({
          cacheId: cacheId,
          args,
          cache: getCacheStore,
          request: (args: TQueryRequest) =>
            requestQueryPromise(getCacheStore, args),
          response: { status: response.status, data: response.data },
        });

        return cacheSetResult;
      })();
    // TODO: Make a type that extends promise that works with async return types.
    (promise as any).state = state;
    return promise;
  };

  /*
   * Request query promise.
   */
  const requestQueryPromise = (
    getCacheStore: () => TCache,
    args: TQueryRequest,
  ): Promise<AccessorQueryResultCacheSetResult<TData>> => {
    const {
      dataAccess: { set, query: cacheQuery },
    } = getCacheStore();

    // Get the cache id for this request.
    const cacheId = cache.id({ args });

    debug &&
      console.log(`[data-access:${queryName}:${cacheId}] read query cache.`);

    // Does our library have any errors that occurred?
    const cacheQueryRequest = cacheQuery.get(cacheId);
    if (cacheQueryRequest instanceof Error) {
      throw cacheQueryRequest;
    }

    // Do we have an existing query request promise in the cache?
    const cacheQueryPromise = cacheQueryRequest?.promise;
    if (cacheQueryPromise) {
      debug &&
        console.log(`[data-access:${queryName}:${cacheId}] query cache found.`);
      return cacheQueryPromise;
    } else {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheId}] query cache *not* found.`,
        );
    }

    // Execute request query promise.
    debug &&
      console.log(`[data-access:${queryName}:${cacheId}] execute query.`);
    const promise: Promise<AccessorQueryResultCacheSetResult<TData>> =
      queryPromise({
        getCacheStore,
        cacheId,
        args,
      });

    // Cache request query promise.
    set(({ dataAccess: { query: cacheQuery } }) => {
      cacheQuery.set(cacheId, {
        cacheTimeToRefresh: Date.now() + cache.duration,
        // NOTE: This is stored in cache with a generic type of 'any'.
        //       Not sure why typescript doesn't throw here without type casting.
        promise,
      });
    });

    return promise;
  };

  /*
   * Suspend request query.
   */
  const suspenseRequestQuery = ({
    getCacheStore,
    onDone,
    args,
  }: {
    getCacheStore: () => TCache;
    onDone?: () => void;
    args: TQueryRequest;
  }): (() => AccessorQueryResultCacheSetResult<TData>) => {
    const {
      dataAccess: { set, suspense: cacheSuspense },
    } = getCacheStore();

    // Do we have an existing request in the cache?
    const cacheId = cache.id({ args });

    debug &&
      console.log(`[data-access:${queryName}:${cacheId}] read suspense cache.`);

    const cacheRequestSuspense = cacheSuspense.get(cacheId);
    if (cacheRequestSuspense) {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheId}] suspense cache found.`,
        );
      return cacheRequestSuspense;
    } else {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheId}] suspense cache *not* found.`,
        );
    }

    // Execute query request in suspense format.
    debug &&
      console.log(
        `[data-access:${queryName}:${cacheId}] expecute query promise.`,
      );
    const suspense: () => AccessorQueryResultCacheSetResult<TData> = suspend(
      requestQueryPromise(getCacheStore, args).then(result => {
        onDone && onDone();
        return result;
      }),
    );

    // Cache suspended request query.
    set(({ dataAccess: { suspense: cacheSuspense } }) => {
      cacheSuspense.set(
        cacheId,
        // NOTE: This is stored in cache with a generic type of 'any'.
        //       Not sure why typescript doesn't throw here without type casting.
        suspense,
      );
    });

    // Return suspense!
    return suspense;
  };

  /*
   * Accessor definition.
   */
  return {
    configuration,
    context: {
      queryName,
      requestQueryPromise,
      suspenseRequestQuery,
    },
  };
};
