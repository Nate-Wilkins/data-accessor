import { getDefaultValue } from '../configuration';
import { createCallbackCache } from './create_callback_cache';
import { createCallbackCaller } from './create_callback_caller';
import { createCallbackLimiter } from './create_callback_limiter';
import { createLazySuspense } from './create_lazy_suspense';
import { CacheResult, ConfigurationQuery } from './types';
import { validateConfiguration } from './validate_configuration';

// Provides a default cache for suspense calls.
const defaultCacheSuspense = new Map<string, () => CacheResult<any>>();

/**
 * Use a query.
 *
 * This hook utilizes `React.Suspense`, `React.ErrorBoundary`, and proxies to make data querying easier on the client.
 *
 * Order of execution is as follows:
 *   1. Validate configuration.
 *   2. Flatten configuration.
 *   3. Setup query caller.
 *   4. Setup cache limiter.
 *   5. Setup cache primer.
 *   6. Setup cache invalidation for query request.
 *   7. Get result from data cache (isPrimable).
 *   8. Create suspended request query.
 *   9. Create callback for query more.
 *
 * @param.configuration.debug <false>                                                    - Turns logging on or off.
 *
 * @param.configuration.cache.ttl                                                        - How long, in milliseconds, the accessor cache should be used for before being invalidated.
 * @param.configuration.cache.isPrimable                  <true>                         - Determines if the accessor can be primed from the cache of other data accessors.
 *                                                                                         Once primed the `configuration.cacheDuration` will be respected.
 * @param.configuration.cache.id                                                         - Synchrounous get function used to reference the accessor cache.
 * @param.configuration.cache.set                                                        - Synchrounous set function used to assign the query's response to cache.
 * @param.configuration.cache.get                                                        - Synchrounous get function used to construct the accessor response from cache.
 * @param.configuration.cache.clear                                                      - Synchrounous clear funtion used to clear out the data cache for the request.
 *
 * @param configuration.cache.invalidate.auto.enable      <false>                        - Determine if the accessor should invalidate automatically.
 * @param configuration.cache.invalidate.auto.ttl         <configuration.cache.ttl>      - How long, in milliseconds, the cache should be invalidated.
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
 * @param configuration.queryRequest                                                     - Asynchrounous get function used to populate the accessor cache.
 * @param configuration.queryRequestMore                                                 - Function used to create an asynchrounous function to request additional data.
 *
 * @param suspense.cache.get                                                             - Cache getter for controlling suspense.
 * @param suspense.cache.set                                                             - Cache setter for controlling suspense.
 *
 * @param args                                                                           - Arguments to send to the query.
 *
 * @returns (cache: TCache, args: TQueryRequest) => AccessorQueryResult<TData>
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
 *     const { data: bookReports } = useGetBookReports({ bookId: book.id });
 *     return <>{bookReports}</>;
 *   };
 *   ```
 */
export const useQuery = <TQueryRequest, TQueryResponse, TData>(
  configuration: ConfigurationQuery<TQueryRequest, TQueryResponse, TData>,
  args: TQueryRequest,
) => {
  // 1. Validate configuration.
  validateConfiguration(configuration);

  // 2. Flatten configuration.
  // prettier-ignore
  const {
    cCacheClear,
    cCacheGet,
    cCacheId,
    // cCacheInvalidateAutoConstraintsEnforce,
    // cCacheInvalidateAutoConstraintsMaxDelay,
    cCacheInvalidateAutoEnable,
    // cCacheInvalidateAutoShowLoading,
    cCacheInvalidateAutoTtl,
    cCacheIsPrimable,
    cCacheLimit,
    cCacheSet,
    cCacheTtl,
    // cConstraintsEnforce,
    // cConstraintsMaxDelay,
    cDebug,
    cQueryRequest,
    cQueryRequestMore,
    cSuspense: {
      sCacheSet,
      sCacheGet,
    }
  } = {
    cCacheClear:                              configuration.cache.clear,
    cCacheGet:                                configuration.cache.get,
    cCacheId:                                 configuration.cache.id,
    // cCacheInvalidateAutoConstraintsEnforce:   getDefaultValue(configuration.cache.invalidate?.auto?.constraints?.enforce,   false),
    // cCacheInvalidateAutoConstraintsMaxDelay:  getDefaultValue(configuration.cache.invalidate?.auto?.constraints?.maxDelay,  null),
    cCacheInvalidateAutoEnable:               getDefaultValue(configuration.cache.invalidate?.auto?.enable,                 false),
    // cCacheInvalidateAutoShowLoading:          getDefaultValue(configuration.cache.invalidate?.auto?.showLoading,            true),
    cCacheInvalidateAutoTtl:                  getDefaultValue(configuration.cache.invalidate?.auto?.ttl,                    configuration.cache.ttl),
    cCacheIsPrimable:                         getDefaultValue(configuration.cache.isPrimable,                               true),
    cCacheLimit:                              getDefaultValue(configuration.cache.limit,                                    0),
    cCacheSet:                                configuration.cache.set,
    cCacheTtl:                                configuration.cache.ttl,
    // cConstraintsEnforce:                      getDefaultValue(configuration.constraints?.enforce,                           false),
    // cConstraintsMaxDelay:                     getDefaultValue(configuration.constraints?.maxDelay,                          null),
    cDebug:                                   getDefaultValue(configuration.debug, false),
    cQueryRequest:                            configuration.queryRequest,
    cQueryRequestMore:                        getDefaultValue(configuration.queryRequestMore, null),
    cSuspense:                                (() => {
      if (configuration.suspense) {
        return {
          sCacheSet: configuration.suspense.cache.set,
          sCacheGet: configuration.suspense.cache.get,
        };
      }

      return {
        sCacheSet: (k: string, v: () => CacheResult<TData>) => defaultCacheSuspense.set(k, v),
        sCacheGet: (k: string) => {
          return defaultCacheSuspense.get(k) || null;
        }
      };
    })()
  };

  // Get query identifier.
  const queryId = cCacheId({ args });

  cDebug &&
    console.log(`[data-accessor:${queryId}]: 1. Validate configuration.`);
  cDebug &&
    console.log(`[data-accessor:${queryId}]: 2. Flatten configuration..`);

  // 3. Setup query caller.
  cDebug && console.log(`[data-accessor:${queryId}]: 3. Setup query caller.`);
  const callbackQueryRequest = async () => {
    cDebug && console.log(`[data-accessor:${queryId}.query]: execute.`);
    try {
      const response = await cQueryRequest(args);

      // Handle query errors.
      if (response.status !== 200 || response.error || !response.data) {
        throw new Error(
          `(${response.status}) Response failed${
            response.error ? `: ${response.error}` : '.'
          }`,
        );
      }

      // Set query data cache.
      cDebug &&
        console.log(`[data-accessor:${queryId}.query]: set data cache.`);
      const result = cCacheSet({
        args,
        response: { status: response.status, data: response.data },
      });

      return {
        data: result.data,
      };
    } catch (e) {
      cDebug &&
        console.error(`[data-accessor:${queryId}.query]: error executing.`);
      throw e;
    }
  };
  const {
    count: callbackCallerQueryCount,
    callback: callbackCallerQueryRequest,
  } = createCallbackCaller(callbackQueryRequest, { reset: false, max: 1 });

  // 4. Setup cache limiter.
  cDebug &&
    console.log(
      `[data-accessor:${queryId}]: 4. Setup cache limiter (cache.limit: ${cCacheLimit}).`,
    );
  const callbackCacheGet = () => {
    cDebug && console.log(`[data-accessor:${queryId}.cacheGet]: execute.`);
    const result = cCacheGet({ args });
    if (result !== null) {
      cDebug &&
        console.log(`[data-accessor:${queryId}.cacheGet]: entry found.`);
    } else {
      cDebug &&
        console.log(`[data-accessor:${queryId}.cacheGet]: entry *not* found.`);
    }
    return result;
  };
  const { callback: callbackLimitCacheGet } = createCallbackLimiter(
    callbackCacheGet,
    {
      max: cCacheLimit,
      defaultValue: null,
      reset: true,
    },
  );

  // 5. Setup cache primer.
  cDebug &&
    console.log(
      `[data-accessor:${queryId}]: 5. Setup cache primer (cache.isPrimable: ${cCacheIsPrimable}).`,
    );
  const callbackCachePrimerCondition =
    callbackCallerQueryCount.current > 0 || cCacheIsPrimable
      ? callbackLimitCacheGet
      : callbackCallerQueryRequest;

  // 6. Setup cache invalidation for query request.
  cDebug &&
    console.log(
      `[data-accessor:${queryId}]: 6. Setup cache invalidation for query request.`,
    );
  const callbackCacheInvalidate = async () => {
    cDebug && console.log(`[data-accessor:${queryId}.invalidate]: execute.`);
    return cCacheClear({ args });
  };
  const {
    callback: callbackRequestQuery,
    invalidate: callbackRequestQueryInvalidate,
  } = createCallbackCache(
    callbackCachePrimerCondition,
    callbackCacheInvalidate,
    {
      ttl: cCacheTtl,
      invalidate: {
        auto: {
          enable: cCacheInvalidateAutoEnable,
          ttl: cCacheInvalidateAutoTtl,
        },
      },
    },
  );

  // 7. Get result from data cache (isPrimable).
  const cacheResult = callbackCachePrimerCondition();
  cDebug &&
    console.log(
      `[data-accessor:${queryId}]: 7. Get result from data cache (isPrimable).`,
    );

  // 8. Create suspended request query.
  const result = createLazySuspense(
    queryId,
    callbackRequestQuery,
    sCacheGet,
    sCacheSet,
  );

  // 9. Create callback for query more.
  cDebug &&
    console.log(
      `[data-accessor:${queryId}]: 9. Create callback for query more.`,
    );
  const callbackGetQueryRequestMore = ({
    args,
    data,
  }: {
    args: TQueryRequest;
    data: TData;
  }) => {
    if (!cQueryRequestMore) {
      return null;
    }
    return cQueryRequestMore({ args, data });
  };
  const queryRequestMore = callbackGetQueryRequestMore({
    args,
    data: result.data,
  });

  return {
    data: result.data,
    cache: { invalidate: callbackRequestQueryInvalidate },
    queryRequestMore,
  };
};
