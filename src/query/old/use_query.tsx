import { useCallback, useEffect, useRef, useState } from 'react';
import { getDefaultValue } from '../configuration';
import { suspend } from '../suspend';
import {
  AccessorQueryConfiguration,
  AccessorQueryConfigurationConstraints,
  AccessorQueryResult,
  AccessorQueryResultCacheSetResult,
  CacheQuery,
  CacheSuspense,
  ErrorTimedOut,
} from './types';
import { validateAccessorConfiguration } from './validate_accessor_configuration';

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
 * @param.configuration.debug <false>                                                    - Turns logging on or off.
 *
 * @param.configuration.cache.duration                                                   - How long, in milliseconds, the accessor cache should be used for before being invalidated.
 * @param.configuration.cache.isPrimableFromCache         <true>                         - Determines if the accessor can be primed from the cache of other data accessors.
 *                                                                                         Once primed the `configuration.cacheDuration` will be respected.
 * @param.configuration.cache.id                                                         - Synchrounous get function used to reference the accessor cache.
 * @param.configuration.cache.set                                                        - Synchrounous set function used to assign the query's response to cache.
 * @param.configuration.cache.get                                                        - Synchrounous get function used to construct the accessor response from cache.
 *
 * @param configuration.cache.invalidate.auto.enable      <false>                        - Determine if the accessor should invalidate automatically.
 * @param configuration.cache.invalidate.auto.interval    <configuration.cache.duration> - How long, in milliseconds, the cache should be invalidated.
 * @param configuration.cache.invalidate.auto.showLoading <false>                        - Determine if the query should be suspenseful when invalidating automatically.
 *                                                                                         Which tells suspense the query is loading.
 *
 * @param.configuration.constraints.enforce               <false>                        - Determine if the accessor should throw when the constraints aren't met.
 * @param.configuration.constraints.maxDelay              <Infinity>                     - When provided the accessor will be timed.
 *                                                                                         To see timings you must have `debug` enabled.
 *                                                                                         If `enforce` is enabled then the accessor will
 *                                                                                         throw if the accessor can't resolve data within the
 *                                                                                         `maxDelay`.
 *
 * @param configuration.query                                                            - Asynchrounous get function used to populate the accessor cache.
 *
 * @returns (cache: TCache, args: TQueryRequest) => AccessorQueryResult<TData>
 * @param cache                                                                          - Where to store cache data for data access.
 * @param args                                                                           - Arguments to send to the query.
 *
 * @example
 *   ```
 *   // use_get_book.tsx
 *   const useGetBook = useQuery(configuration, { ... });
 *
 *   // use_get_book_reports.tsx
 *   const useGetBookReports = useQuery(configuration, { ... });
 *
 *   // BookReports.tsx
 *   const BookReports = ({ id }) => {
 *     const { data: book } = useGetBook({ id });
 *     const { data: bookReports } = useGetBookReports({ pageId: page.id });
 *     return <>{bookReports}</>;
 *   };
 *   ```
 */
export const useQuery = <TCache, TQueryRequest, TQueryResponse, TData>(
  configuration: AccessorQueryConfiguration<
    TCache,
    TQueryRequest,
    TQueryResponse,
    TData
  >,
  getCacheStore: () => TCache,
  args: TQueryRequest,
): AccessorQueryResult<TData> => {
  // Validate configuration.
  validateAccessorConfiguration(configuration);

  // Flatten configuration.
  const {
    cCacheClear,
    cCacheDuration,
    cCacheGet,
    cCacheId,
    cCacheInvalidateAutoConstraintsEnforce,
    cCacheInvalidateAutoConstraintsMaxDelay,
    cCacheInvalidateAutoEnable,
    cCacheInvalidateAutoInterval,
    cCacheInvalidateAutoShowLoading,
    cCacheIsPrimableFromCache,
    cCacheSet,
    cConstraintsEnforce,
    cConstraintsMaxDelay,
    cDebug,
    cQuery,
    cQueryName,
  } = {
    cDebug: configuration.debug,
    cCacheDuration: configuration.cache.duration,
    cCacheGet: configuration.cache.get,
    cCacheSet: configuration.cache.set,
    cCacheClear: configuration.cache.clear,
    cCacheId: configuration.cache.id,
    cCacheInvalidateAutoEnable: getDefaultValue(
      configuration.cache.invalidate?.auto?.enable,
      false,
    ),
    cCacheInvalidateAutoInterval: getDefaultValue(
      configuration.cache.invalidate?.auto?.interval,
      null,
    ),
    cCacheInvalidateAutoShowLoading: getDefaultValue(
      configuration.cache.invalidate?.auto?.showLoading,
      true,
    ),
    cCacheInvalidateAutoConstraintsEnforce: getDefaultValue(
      configuration.cache.invalidate?.auto?.constraints?.enforce,
      false,
    ),
    cCacheInvalidateAutoConstraintsMaxDelay: getDefaultValue(
      configuration.cache.invalidate?.auto?.constraints?.maxDelay,
      null,
    ),
    cCacheIsPrimableFromCache: getDefaultValue(
      configuration.cache.isPrimableFromCache,
      true,
    ),
    cConstraintsEnforce: getDefaultValue(
      configuration.constraints?.enforce,
      false,
    ),
    cConstraintsMaxDelay: getDefaultValue(
      configuration.constraints?.maxDelay,
      null,
    ),
    cQueryName: configuration.query.name,
    cQuery: configuration.query,
  };

  // Track internal result state.
  const [result, setResult] = useState<AccessorQueryResult<TData>>();
  const [, setTriggerRender] = useState<Record<string, string>>();
  const cacheQuery = useRef<null | CacheQuery>(null);
  const cacheSuspense = useRef<null | CacheSuspense>(null);

  const rerender = useCallback(() => setTriggerRender({}), []);

  /**
   * Query promise.
   */
  const queryPromise = useCallback(
    ({
      args,
      request,
    }: {
      args: TQueryRequest;
      request: (
        args: TQueryRequest,
      ) => Promise<AccessorQueryResultCacheSetResult<TData>>;
    }): Promise<AccessorQueryResultCacheSetResult<TData>> => {
      return (async () => {
        const cacheId = cCacheId({ args });

        try {
          // Execute query.
          const response = await cQuery(args);
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
          const cacheSetResult = cCacheSet({
            cacheId,
            args,
            cache: getCacheStore,
            request,
            response: { status: response.status, data: response.data },
          });

          return cacheSetResult;
        } catch (e) {
          console.error(
            `[data-access:${cQueryName}:${cacheId}:queryPromise] error running query.`,
          );
          throw e;
        }
      })();
    },
    [cCacheId, cQueryName, cCacheSet, cQuery, getCacheStore],
  );

  /**
   * Request query promise.
   */
  const requestQueryPromise = useCallback(
    ({
      args,
    }: {
      args: TQueryRequest;
    }): Promise<AccessorQueryResultCacheSetResult<TData>> => {
      const cacheId = cCacheId({ args });

      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:queryPromise:cacheQuery] read.`,
        );

      // Does our library have any errors that occurred?
      if (cacheQuery.current instanceof Error) {
        throw cacheQuery;
      }

      // Do we have an existing query request promise in the cache?
      const cacheQueryPromise = cacheQuery.current?.promise;
      if (cacheQueryPromise) {
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:queryPromise:cacheQuery] entry found.`,
          );
        return cacheQueryPromise;
      } else {
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:queryPromise:cacheQuery] entry *not* found.`,
          );
      }

      // Execute request query promise.
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:queryPromise] execute query.`,
        );
      const promise: Promise<AccessorQueryResultCacheSetResult<TData>> =
        queryPromise({
          args,
          request: (args: TQueryRequest) => requestQueryPromise({ args }),
        });

      // Cache request query promise.
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:queryPromise:cacheQuery] set.`,
        );
      cacheQuery.current = {
        cacheTimeToRefresh: Date.now() + cCacheDuration,
        // NOTE: This is stored in cache with a generic type of 'any'.
        //       Not sure why typescript doesn't throw here without type casting.
        promise,
      };

      return promise;
    },
    [cDebug, cQueryName, cCacheDuration, cCacheId, cacheQuery, queryPromise],
  );

  /**
   * Suspend request query.
   */
  const suspenseRequestQuery = useCallback(
    ({
      onDone,
      args,
    }: {
      onDone?: () => void;
      args: TQueryRequest;
    }): (() => AccessorQueryResultCacheSetResult<TData>) => {
      const cacheId = cCacheId({ args });

      // Do we have an existing request in the cache?
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:suspense:cacheSuspense] read.`,
        );
      const cacheRequestSuspense = cacheSuspense.current;
      if (cacheRequestSuspense) {
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:suspense:cacheSuspense] entry found.`,
          );
        return cacheRequestSuspense;
      } else {
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:suspense:cacheSuspense] entry *not* found.`,
          );
      }

      // Execute query request in suspense format.
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:suspense] execute query promise.`,
        );
      const suspense: () => AccessorQueryResultCacheSetResult<TData> = suspend(
        requestQueryPromise({ args }).then(result => {
          onDone && onDone();
          return result;
        }),
      );

      // Cache suspended request query.
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:suspense:cacheSuspense] set.`,
        );
      cacheSuspense.current = suspense;

      // Return suspense!
      return suspense;
    },
    [cDebug, cQueryName, cCacheId, cacheSuspense, requestQueryPromise],
  );

  /**
   * Start a performance profile.
   */
  const startPerformanceProfile = useCallback(
    (startPerformanceProfileArgs?: {
      constraints?: AccessorQueryConfigurationConstraints | undefined;
    }): null | ((args: { args: TQueryRequest }) => void) => {
      // Collect applicable constraints.
      const constraints = Object.assign(
        {},
        {
          enforce: cConstraintsEnforce,
          maxDelay: cConstraintsMaxDelay,
        },
        startPerformanceProfileArgs?.constraints,
      );

      // Are we profiling?
      if (
        typeof constraints === 'undefined' ||
        typeof constraints.maxDelay !== 'number'
      ) {
        return null;
      }

      // Start profiling.
      const timeStart = window.performance.now();

      // End profiling.
      return ({ args }: { args: TQueryRequest }) => {
        const cacheId = cCacheId({ args });

        // NOTE: When an error occurs after we've assigned the cache the cache result would be returned.
        //       But here we make sure that the cache returns an error.
        try {
          const timeEnd = window.performance.now();
          const duration = timeEnd - timeStart;
          cDebug &&
            console.log(
              `[data-access:${cQueryName}:${cacheId}] request took ${duration}ms`,
            );
          if (
            typeof constraints.maxDelay === 'number' &&
            duration > constraints.maxDelay
          ) {
            cDebug &&
              console.error(
                `[data-access:${cQueryName}:${cacheId}] request timed out! Took ${
                  duration - constraints.maxDelay
                }ms longer than expected.`,
              );
            if (constraints.enforce) {
              throw new ErrorTimedOut(cQueryName, cacheId);
            }
          }
        } catch (e) {
          /* istanbul ignore else */
          if (e instanceof Error) {
            cacheQuery.current = e as Error;
          } else {
            // Should never happen.
            console.error('[data-access]: A error object was not an error.');
          }
        }
      };
    },
    [cDebug, cConstraintsEnforce, cConstraintsMaxDelay, cQueryName, cCacheId],
  );

  /**
   * Allow accessor result to clear.
   */
  const clear = useCallback(() => {
    const cacheId = cCacheId({ args });

    // Clear accessor cache for requests.
    cacheQuery.current = null;
    cacheSuspense.current = null;

    // Clear accessor cache for data.
    cCacheClear({
      cacheId,
      args,
      cache: getCacheStore,
    });
  }, [cCacheClear, args, cCacheId, getCacheStore]);

  /**
   * Allow accessor result to invalidate.
   */
  const invalidate = useCallback(
    async (invalidateArgs?: {
      showLoading: boolean;
      constraints?: AccessorQueryConfigurationConstraints;
    }) => {
      clear();

      // Should we show a suspense loading state?
      if (invalidateArgs && invalidateArgs.showLoading) {
        rerender();
      } else {
        // Start performance profile.
        const endPerformanceProfile = startPerformanceProfile({
          constraints: invalidateArgs?.constraints,
        });

        suspenseRequestQuery({
          onDone: () => {
            endPerformanceProfile && endPerformanceProfile({ args });
            rerender();
          },
          args,
        });
      }
    },
    [clear, rerender, startPerformanceProfile, suspenseRequestQuery, args],
  );

  // Cache auto invalidation.
  useEffect(() => {
    const cacheId = cCacheId({ args });

    if (!cCacheInvalidateAutoEnable) {
      return;
    }

    const interval = setInterval(() => {
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:autoInvalidate] execute.`,
        );

      invalidate({
        showLoading: cCacheInvalidateAutoShowLoading,
        constraints: {
          enforce: cCacheInvalidateAutoConstraintsEnforce,
        },
      });
    }, cCacheInvalidateAutoInterval || cCacheDuration);

    return () => {
      clearInterval(interval);
    };
  }, [
    cDebug,
    cQueryName,
    cCacheDuration,
    cCacheInvalidateAutoEnable,
    cCacheInvalidateAutoInterval,
    cCacheInvalidateAutoShowLoading,
    cCacheInvalidateAutoConstraintsEnforce,
    cCacheInvalidateAutoConstraintsMaxDelay,
    cCacheId,
    invalidate,
    args,
  ]);

  // Make a accessor request.
  useEffect(() => {
    const cacheId = cCacheId({ args });

    // Do we have a cached result?
    cDebug &&
      console.log(`[data-access:${cQueryName}:${cacheId}:request] execute.`);
    cDebug &&
      console.log(
        `[data-access:${cQueryName}:${cacheId}:request:cacheData] read.`,
      );

    // Do we have the data for this request already?
    const cacheResult = cCacheGet({
      cacheId: cacheId,
      cache: getCacheStore,
      args,
      request: (args: TQueryRequest) => requestQueryPromise({ args }),
    });

    // Does our library have any errors that occurred?
    if (cacheQuery.current instanceof Error) {
      throw cacheQuery;
    }

    // Did we make a request for this data already?
    let result: null | AccessorQueryResultCacheSetResult<TData> = null;
    if (
      cacheQuery.current &&
      (cacheQuery.current.promise as any).state.isQueryFinished
    ) {
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:request:cacheQuery] entry found.`,
        );
      // Do we need to invalidate the cache and request?
      console.error({ d: Date.now() });
      if (Date.now() > cacheQuery.current.cacheTimeToRefresh) {
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:request:cacheQuery] entry expired.`,
          );

        // Cache reset for query & suspense.
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:request:cacheQuery] clear.`,
          );
        cacheQuery.current = null;
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:request:cacheSuspense] clear.`,
          );
        cacheSuspense.current = null;
      } else {
        if (cacheResult) {
          result = cacheResult;
        }
      }
    } else {
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:request:cacheQuery] entry *not* found.`,
        );

      // We haven't made this request before but can we prime it from cache?
      if (cCacheIsPrimableFromCache && cacheResult) {
        cDebug &&
          console.log(
            `[data-access:${cQueryName}:${cacheId}:request:cacheQuery] set. Primed from data cache.`,
          );

        // Cache with resolved cache result.
        console.error({ d: Date.now() });
        cacheQuery.current = {
          cacheTimeToRefresh: Date.now() + cCacheDuration,
          // NOTE: This request cache promise is never checked/used.
          //       Only it's time to live property is relevant.
          promise: null,
        };

        result = cacheResult;
      }
    }

    // Provide a accessor query result.
    if (result) {
      cDebug &&
        console.log(
          `[data-access:${cQueryName}:${cacheId}:request] cache used.`,
        );

      setResult({
        ...result,
        clear,
        invalidate,
      });
    }
  }, [
    cDebug,
    cQueryName,
    cCacheDuration,
    cCacheGet,
    cCacheIsPrimableFromCache,
    cCacheId,
    rerender,
    clear,
    getCacheStore,
    invalidate,
    requestQueryPromise,
    args,
  ]);

  if (result) {
    return result;
  } else {
    // Tell suspense about promise to request backend data.
    // Since this is a proxy designed to request data on access treat this as the real thing.
    return {
      data: new Proxy(
        {},
        {
          get() {
            const cacheId = cCacheId({ args });

            cDebug &&
              console.log(
                `[data-access:${cQueryName}:${cacheId}:request] execute suspense!`,
              );

            // Start performance profile.
            const endPerformanceProfile = startPerformanceProfile();

            // Wrap promise in suspense format.
            return suspenseRequestQuery({
              args,
              onDone: () => {
                endPerformanceProfile && endPerformanceProfile({ args });
                rerender();
              },
            })();
          },
        },
      ) as TData,
      clear,
      invalidate,
    };
  }
};
