import { useEffect, useState } from 'react';
import {
  AccessorQueryCacheStore,
  AccessorQueryCacheStoreSet,
  AccessorQueryConfiguration,
  AccessorQueryContext,
  AccessorQueryResult,
  AccessorQueryResultCacheSetResult,
  ErrorTimedOut,
} from './types';

/**
 * Use a accessor query hook.
 *
 * This hook utilizes `React.Suspense`, `React.ErrorBoundary`, and proxies to make data querying easier on the client.
 *
 * A "accessor request", which is what this hook is, enables the following:
 *   1. The client invokes the hook.
 *   2. The result cache is read to see if the client has already completed this request, if so provide the accessor result.
 *   3. Otherwise provide the accessor result with a proxy that will "execute" (throw for suspense) the query request when accessed.
 *   4. The proxy can be invoked by client code.
 *   5. Trigger suspense to handle executing the query request. Wait until the query request is completed.
 *   6. The data cache is then set with the query request response.
 *   7. Suspense will allow rendering to continue again.
 *   8. The client will invoke the hook again.
 *   9. Where the request cache is now populated and read.
 *
 * A "query request", also known as a "query" to clients, is where our data comes from for the accessor.
 * The API is a promise but the expectation is that it's data access. So it should **only** retreive data and manage it's data cache.
 *
 * A "accessor clear" is provided in the accessor result and will do the following:
 *   1. Clear the current accessor request cache by calling `configuration.cache.clear`.
 *
 * A "accessor invalidate" is provided in the accessor result and will do the following:
 *   1. Clear the current accessor request cache by calling `configuration.cache.clear` with the accessor request arguments.
 *   2. Run the accessor request again with the cache now cleared.
 *
 * @param.configuration.cache.duration                                                - How long, in milliseconds, the accessor cache should be used for before being invalidated.
 * @param.configuration.cache.isPrimableFromCache      <true>                         - Determines if the accessor can be primed from the cache of other data accessors.
 *                                                                                      Once primed the `configuration.cacheDuration` will be respected.
 * @param.configuration.cache.id                                                      - Synchrounous get function used to reference the accessor cache.
 * @param.configuration.cache.set                                                     - Synchrounous set function used to assign the query's response to cache.
 * @param.configuration.cache.get                                                     - Synchrounous get function used to construct the accessor response from cache.
 *
 * @param configuration.cache.invalidate.auto.enable   <undefined>                    - Determine if the accessor should invalidate automatically.
 * @param configuration.cache.invalidate.auto.interval <configuration.cache.duration> - How long, in milliseconds, the cache should be invalidated.
 *
 * @param.configuration.constraints.enforce            <undefined>                    - Determine if the accessor should throw when the constraints aren't met.
 * @param.configuration.constraints.maxDelay           <undefined>                    - When provided the accessor will be timed.
 *                                                                                      To see timings you must have `debug` enabled.
 *                                                                                      If `enforce` is enabled then the accessor will
 *                                                                                      throw if the accessor can't resolve data within the
 *                                                                                      `maxDelay`.
 *
 * @param.configuration.debug <false>                                                 - Turns logging on or off.
 * @param configuration.query                                                         - Asynchrounous get function used to populate the accessor cache.
 *
 * @returns (cache: TCache, args: TQueryRequest) => AccessorQueryResult<TData>
 * @param cache                                                                       - Where to store cache data for data access.
 * @param args                                                                        - Arguments to send to the query.
 *
 * @example
 *   ```
 *   // use_get_book.tsx
 *   const accessor = createAccessor({ ... });
 *   const useGetBook = useQuery(accessor, { ... });
 *
 *   // use_get_book_reports.tsx
 *   const accessor = createAccessor({ ... });
 *   const useGetBookReports = useQuery(accessor, { ... });
 *
 *   // BookReports.tsx
 *   const BookReports = ({ id }) => {
 *     const { data: book } = useGetBook({ id });
 *     const { data: bookReports } = useGetBookReports({ pageId: page.id });
 *     return <>{bookReports}</>;
 *   };
 *   ```
 */
export const useQuery = <
  TCache extends AccessorQueryCacheStore,
  TQueryRequest,
  TQueryResponse,
  TData,
>(
  accessor: {
    configuration: AccessorQueryConfiguration<
      TCache,
      TQueryRequest,
      TQueryResponse,
      TData
    >;
    context: AccessorQueryContext<TCache, TQueryRequest, TQueryResponse, TData>;
  },
  getCacheStore: () => TCache,
  args: TQueryRequest,
): AccessorQueryResult<TData> => {
  // Configure the accessor.
  const configuration = accessor.configuration;
  const context = accessor.context;

  // Configuration.
  const debug = configuration.debug || false;
  const constraints = configuration.constraints || null;
  const cache = configuration.cache;

  // Context.
  const { queryName, requestQueryPromise, suspenseRequestQuery } = context;

  // Trigger a requery/rerender - Used when invalidating the accessor request.
  const [_, setTriggerRender] = useState<boolean>(false);
  const requery = () => setTriggerRender(v => !v);

  // Cache auto invalidation.
  useEffect(() => {
    if (
      !cache.invalidate ||
      !cache.invalidate.auto ||
      !cache.invalidate.auto.enable
    ) {
      return;
    }

    const interval = setInterval(() => {
      invalidate();
    }, cache.invalidate.auto.interval || cache.duration);

    return () => {
      clearInterval(interval);
    };
  }, [cache.invalidate]);

  // Are we profiling?
  let finishProfiling: undefined | (() => void);
  if (constraints && typeof constraints.maxDelay === 'number') {
    // Start profiling.
    const timeStart = window.performance.now();
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
            `[data-access:${queryName}:${cacheId}] request timed out! Took ${
              duration - constraints.maxDelay
            }ms longer than expected.`,
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

  const cacheQueryRequest = cacheQuery.get(cacheId);

  // Do we have the data for this request already?
  const cacheResult = cache.get({
    cacheId: cacheId,
    cache: getCacheStore,
    args,
    request: (args: TQueryRequest) => requestQueryPromise(getCacheStore, args),
  });

  // Does our library have any errors that occurred?
  if (cacheQueryRequest instanceof Error) {
    throw cacheQueryRequest;
  }

  // Did we make a request for this data already?
  let result: null | AccessorQueryResultCacheSetResult<TData> = null;
  if (
    cacheQueryRequest &&
    (cacheQueryRequest.promise as any).state.isQueryFinished
  ) {
    debug &&
      console.log(
        `[data-access:${queryName}:${cacheId}] request query cache found.`,
      );
    // Do we need to invalidate the cache and request?
    if (Date.now() > cacheQueryRequest.cacheTimeToRefresh) {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheId}] request cache expired.`,
        );

      // Cache reset for query & suspense.
      set(({ dataAccess: { suspense: cacheSuspense, query: cacheQuery } }) => {
        cacheQuery.delete(cacheId);
        cacheSuspense.delete(cacheId);
      });
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

  // Allow accessor result to clear.
  const clear = () => {
    const {
      dataAccess: { set },
    } = getCacheStore();

    // Clear accessor cache for requests.
    set(({ dataAccess: { suspense: cacheSuspense, query: cacheQuery } }) => {
      cacheQuery.delete(cacheId);
      cacheSuspense.delete(cacheId);
    });

    // Clear accessor cache for data.
    cache.clear({
      cacheId,
      args,

      // Stored as correct setter, cast semi-safely.
      set: set as (store: AccessorQueryCacheStoreSet<TCache>) => any,
    });
  };

  // Allow accessor result to invalidate.
  const invalidate = () => {
    clear();
    requery();
  };

  if (result) {
    debug &&
      console.log(
        `[data-access:${queryName}:${cacheId}] request data cache used.`,
      );

    return {
      ...result,
      clear,
      invalidate,
    };
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
              onDone: () => {
                // NOTE: When an error occurs after we've assigned the cache the cache result would be returned.
                //       But here we make sure that the cache returns an error.
                try {
                  finishProfiling && finishProfiling();
                } catch (e) {
                  if (e instanceof Error) {
                    set(({ dataAccess: { query: cacheQuery } }) => {
                      cacheQuery.set(cacheId, e as Error);
                    });
                  } else {
                    // Should never happen.
                    console.error(
                      '[data-access]: A error object was not an error.',
                    );
                  }
                }
              },
              args,
            })();
          },
        },
      ) as TData,
      clear,
      invalidate,
    };
  }
};
