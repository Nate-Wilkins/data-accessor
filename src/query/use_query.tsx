import { createCallbackCache } from './create_callback_cache';
import { createCallbackCaller } from './create_callback_caller';
import { createCallbackLimiter } from './create_callback_limiter';
import { createLazySuspense } from './create_lazy_suspense';
import { ConfigurationQuery } from './types';
import { validateConfiguration } from './validate_configuration';

/**
 * Use a query.
 *
 * This hook utilizes `React.Suspense`, `React.ErrorBoundary`, and proxies to make data querying easier on the client.
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
    cSuspense: { sCacheSet, sCacheGet },
    cCacheData: { sCacheDataSet, sCacheDataGet },
  } = validateConfiguration(configuration);

  // Get query identifier.
  const queryId = cCacheId({ args });

  cDebug >= 1 && console.log(`[data-accessor:${queryId}.query]: execute.`);

  cDebug >= 3 &&
    console.log(`[data-accessor:${queryId}]: 1. Validate configuration.`);

  // 2. Setup cache primer.
  cDebug >= 3 &&
    console.log(
      `[data-accessor:${queryId}]: 2. Setup cache primer (cache.isPrimable: ${cCacheIsPrimable}).`,
    );
  const callbackCacheGet = () => {
    cDebug >= 1 && console.log(`[data-accessor:${queryId}.cacheGet]: execute.`);
    const result = cCacheGet({ args });
    if (result !== null) {
      cDebug >= 1 &&
        console.log(`[data-accessor:${queryId}.cacheGet]: entry found.`);
    } else {
      cDebug >= 1 &&
        console.log(`[data-accessor:${queryId}.cacheGet]: entry *not* found.`);
    }
    return result;
  };

  // 3. Setup cache limiter.
  cDebug >= 3 &&
    console.log(
      `[data-accessor:${queryId}]: 3. Setup cache limiter (cache.limit: ${cCacheLimit}).`,
    );
  const { callback: callbackLimitCacheGet } = createCallbackLimiter(
    callbackCacheGet,
    {
      max: cCacheLimit,
      defaultValue: null,
      reset: true,
    },
  );

  // 4. Setup query caller.
  cDebug >= 3 &&
    console.log(`[data-accessor:${queryId}]: 4. Setup query caller.`);
  const callbackQueryRequest = async () => {
    // Query.
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
      cDebug >= 1 &&
        console.log(`[data-accessor:${queryId}.query]: set data cache.`);
      const result = cCacheSet({
        args,
        response: { status: response.status, data: response.data },
      });

      return {
        data: result.data,
      };
    } catch (e) {
      cDebug >= 1 &&
        console.error(`[data-accessor:${queryId}.query]: error executing.`);
      throw e;
    }
  };
  const {
    count: callbackCallerQueryCount,
    callback: callbackCallerQueryRequest,
  } = createCallbackCaller(callbackQueryRequest, { reset: false, max: 1 });

  // 5. Setup cache invalidation for query request.
  cDebug >= 3 &&
    console.log(
      `[data-accessor:${queryId}]: 5. Setup cache invalidation for query request.`,
    );
  const callbackCacheInvalidate = async () => {
    cDebug >= 1 &&
      console.log(`[data-accessor:${queryId}.invalidate]: execute.`);
    sCacheSet(queryId, null);
    sCacheDataSet(queryId, null);
    return cCacheClear({ args });
  };
  const {
    callback: callbackTtlLimitCacheGet,
    invalidate: callbackLimitCacheGetInvalidate,
  } = createCallbackCache(callbackLimitCacheGet, callbackCacheInvalidate, {
    ttl: cCacheTtl,
    invalidate: {
      auto: {
        enable: cCacheInvalidateAutoEnable,
        ttl: cCacheInvalidateAutoTtl,
      },
    },
  });

  // 6. Create suspense cache option for primable cache.
  cDebug >= 3 &&
    console.log(
      `[data-accessor:${queryId}]: 6. Create suspense cache option for primable cache.`,
    );
  let callbackRequestQueryLimitCacheGet = sCacheDataGet(queryId);
  if (!callbackRequestQueryLimitCacheGet) {
    callbackRequestQueryLimitCacheGet = () => {
      if (callbackCallerQueryCount.current > 0 || cCacheIsPrimable) {
        const cacheResult = callbackTtlLimitCacheGet();
        if (cacheResult) {
          return cacheResult;
        }
      }
      return null;
    };
    sCacheDataSet(queryId, callbackRequestQueryLimitCacheGet);
  }

  let result = callbackRequestQueryLimitCacheGet();
  if (!result) {
    // 7. Create suspended request query.
    cDebug >= 3 &&
      console.log(
        `[data-accessor:${queryId}]: 7. Create suspended request query.`,
      );
    result = createLazySuspense(
      queryId,
      callbackCallerQueryRequest,
      sCacheGet,
      sCacheSet,
    );
  }

  // 8. Create callback for query more.
  cDebug >= 3 &&
    console.log(
      `[data-accessor:${queryId}]: 8. Create callback for query more.`,
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
    cache: { invalidate: callbackLimitCacheGetInvalidate },
    queryRequestMore,
  };
};
