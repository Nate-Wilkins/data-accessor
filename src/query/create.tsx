import { suspend } from '../suspend';
import {
  AccessorQueryCacheStore,
  AccessorQueryCacheStoreSet,
  AccessorQueryConfiguration,
  AccessorQueryResult,
  ErrorTimedOut,
} from './types';

/*
 * A minimal cache store for data access.
 *
 * This is used so that the cache can be reset with other data in the cache.
 */
export const createCache = (
  set: (store: AccessorQueryCacheStoreSet<AccessorQueryCacheStore>) => void,
): AccessorQueryCacheStore => {
  return {
    dataAccess: {
      // State management libraries are usually immutable.
      // This allows the library to set cache state.
      set,

      // Request promise cache.
      query: new Map<
        string,
        {
          cacheTimeToRefresh: number;
          promise: null | Promise<AccessorQueryResult<any>>;
        }
      >(),
      // Request suspense cache.
      suspense: new Map<string, () => AccessorQueryResult<any>>(),
    },
  };
};

/*
 * Creates an accessor query hook.
 *
 * An accessor query is a data query hook used to query data.
 *
 * This query hook utilizes `React.Suspense`, `React.ErrorBoundary`, and proxies to make data querying easier on the client.
 *
 * This happens in the following order:
 *   1. The client invokes the hook.
 *   2. The result cache is read to see if the client has already completed this request, if so provide the result.
 *   3. Otherwise return a proxy that will "execute" (throw for suspense) the query when accessed.
 *   4. The proxy is invoked by client code.
 *   5. Triggering suspense to handle executing the query request.
 *   6. The request cache is read to see if the client has already made this request, if so use that request.
 *   7. Otherwise create a new request and store it in the request cache.
 *   8. Once the request completes cache the result.
 *
 * @param.configuration.cache.duration                             - How long, in seconds, the accessor cache should be used for before being invalidated.
 * @param.configuration.cache.isPrimableFromCache <true>           - Determines if the accessor can be primed from the cache of other data accessors.
 *                                                                   Once primed the `configuration.cacheDuration` will be respected.
 * @param.configuration.cache.id                                   - Synchrounous get function used to reference the accessor cache.
 * @param.configuration.cache.set                                  - Synchrounous set function used to assign the query's response to cache.
 * @param.configuration.cache.get                                  - Synchrounous get function used to construct the accessor response from cache.
 * @param.configuration.constraints.enforce                        - Determine if the accessor should throw when the constraints aren't met.
 * @param.configuration.constraints.maxDelay <null>                - When provided the accessor will be timed.
 *                                                                   To see timings you must have `debug` enabled.
 *                                                                   If `enforce` is enabled then the accessor will
 *                                                                   throw if the accessor can't resolve data within the
 *                                                                   `maxDelay`.
 * @param.configuration.debug <false>                              - Turns logging on or off.
 * @param configuration.query                                      - Asynchrounous get function used to populate the accessor cache.
 *
 * @returns (cache: Cache, args: QueryRequest) => AccessorQueryResult<Data
 * @param cache                                          - Where to store cache data for data access.
 * @param args                                           - Arguments to send to the query.
 *
 * @example
 *   ```
 *   // use_get_book.tsx
 *   const useGetBook = createHook({ ... });
 *
 *   // use_get_book_reports.tsx
 *   const useGetBookReports = createHook({ ... });
 *
 *   // BookReports.tsx
 *   const BookReports = ({ id }) => {
 *     const { data: book } = useGetBook({ id });
 *     const { data: bookReports } = useGetBookReports({ pageId: page.id });
 *     return <>{bookReports}</>;
 *   };
 *   ```
 */
export const createHook = <
  Cache extends AccessorQueryCacheStore,
  QueryRequest,
  QueryResponse,
  Data
>({
  debug,
  cache,
  query,
  constraints,
}: AccessorQueryConfiguration<Cache, QueryRequest, QueryResponse, Data>): ((
  getCacheStore: () => Cache,
  args: QueryRequest,
) => AccessorQueryResult<Data>) => {
  const queryName = query.name;

  /*
   * Query promise.
   */
  const queryPromise = ({
    getCacheStore,
    cacheId,
    args,
  }: {
    getCacheStore: () => Cache;
    cacheId: string;
    args: QueryRequest;
  }): Promise<AccessorQueryResult<Data>> => {
    let state = { isQueryFinished: false };
    const promise: Promise<AccessorQueryResult<Data>> = (async () => {
      // Execute query.
      const response = await query(args);
      state.isQueryFinished = true;

      // Handle query errors.
      if (response.status !== 200 || response.error || !response.data) {
        throw new Error(
          `(${response.status}) Response failed${
            response.error ? `: ${response.error}` : ''
          }`,
        );
      }

      // Set query promise result cache.
      return cache.set({
        cacheId: cacheId,
        args,
        cache: getCacheStore,
        request: (args: QueryRequest) =>
          requestQueryPromise(getCacheStore, args),
        response: { status: response.status, data: response.data },
      });
    })();
    // TODO: Make a type that extends promise that works with async return types.
    (promise as any).state = state;
    return promise;
  };

  /*
   * Request query promise.
   */
  const requestQueryPromise = (
    getCacheStore: () => Cache,
    args: QueryRequest,
  ): Promise<AccessorQueryResult<Data>> => {
    const {
      dataAccess: { set, query: cacheQuery },
    } = getCacheStore();

    // Do we have an existing query request promise in the cache?
    const cacheId = cache.id({ args });

    debug &&
      console.log(`[data-access:${queryName}:${cacheId}] read query cache.`);

    const cacheQueryPromise = cacheQuery.get(cacheId)?.promise;
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
    const promise: Promise<AccessorQueryResult<Data>> = queryPromise({
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
    getCacheStore: () => Cache;
    onDone?: () => void;
    args: QueryRequest;
  }): (() => AccessorQueryResult<Data>) => {
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
          `[data-access:${queryName}:${cacheId}] suspense cache found for.`,
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
    const suspense: () => AccessorQueryResult<Data> = suspend(
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
   * Accessor hook.
   */
  return (
    getCacheStore: () => Cache,
    args: QueryRequest,
  ): AccessorQueryResult<Data> => {
    // Are we profiling?
    let finishProfiling: undefined | (() => void);
    if (typeof constraints.maxDelay === 'number') {
      // Start profiling.
      let timeStart = window.performance.now();
      finishProfiling = () => {
        const timeEnd = window.performance.now();
        const duration = timeEnd - timeStart;
        debug &&
          console.log(
            `[data-access:${queryName}:${cacheId}] request took ${duration}ms`,
          );
        if (
          typeof constraints.maxDelay === 'number' &&
          duration > constraints.maxDelay
        ) {
          debug &&
            console.error(
              `[data-access:${queryName}:${cacheId}] request timed out! Took ${duration -
                constraints.maxDelay}ms longer than expected.`,
            );
          if (constraints.enforce) {
            throw new ErrorTimedOut(queryName, cacheId);
          }
        }
      };
    }

    // Do we have a cached result?
    const {
      dataAccess: { set, query: cacheQuery },
    } = getCacheStore();
    const cacheId = cache.id({ args });

    debug &&
      console.log(`[data-access:${queryName}:${cacheId}] execute request.`);

    debug &&
      console.log(`[data-access:${queryName}:${cacheId}] read data cache.`);

    const cacheRequestQuery = cacheQuery.get(cacheId);

    // Do we have the data for this request already?
    const cacheResult = cache.get({
      cacheId: cacheId,
      cache: getCacheStore,
      args,
      request: (args: QueryRequest) => requestQueryPromise(getCacheStore, args),
    });

    // Did we make a request for this data already?
    let result = null;
    if (
      cacheRequestQuery &&
      (cacheRequestQuery.promise as any).state.isQueryFinished
    ) {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheId}] request query cache found.`,
        );
      // Do we need to invalidate the cache and request?
      if (Date.now() > cacheRequestQuery.cacheTimeToRefresh) {
        debug &&
          console.log(
            `[data-access:${queryName}:${cacheId}] request cache expired.`,
          );

        // Cache reset for query & suspense.
        set(
          ({ dataAccess: { suspense: cacheSuspense, query: cacheQuery } }) => {
            cacheQuery.delete(cacheId);
            cacheSuspense.delete(cacheId);
          },
        );
      } else {
        if (cacheResult) {
          result = cacheResult;
        }
      }
    } else {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheId}] request query cache *not* found.`,
        );

      // We haven't made this request before but can we prime it from cache?
      if (cache.isPrimableFromCache && cacheResult) {
        debug &&
          console.log(
            `[data-access:${queryName}:${cacheId}] request query cache primed from data cache.`,
          );

        // Cache with resolved cache result.
        set(({ dataAccess: { query: cacheQuery } }) => {
          cacheQuery.set(cacheId, {
            cacheTimeToRefresh: Date.now() + cache.duration,
            // NOTE: This request cache promise is never checked/used.
            //       Only it's time to live property is relevant.
            promise: null,
          });
        });

        result = cacheResult;
      }
    }

    if (result) {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheId}] request data cache used.`,
        );

      return result;
    } else {
      // Tell suspense about promise to request backend data.
      // Since this is a proxy designed to request data on access treat this as the real thing.
      return {
        data: new Proxy(
          {},
          {
            get() {
              debug &&
                console.log(
                  `[data-access:${queryName}:${cacheId}] execute suspense!`,
                );

              // Wrap promise in suspense format.
              return suspenseRequestQuery({
                getCacheStore,
                onDone: finishProfiling,
                args,
              })();
            },
          },
        ) as Data,
      };
    }
  };
};
