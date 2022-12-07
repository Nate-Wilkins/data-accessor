import produce from 'immer';
import { suspend } from '../suspend';
import {
  AccessorCacheStore,
  AccessorCacheStoreSet,
  AccessorConfiguration,
  AccessorQueryResult,
} from './types';

/*
 * A minimal cache store for data access.
 */
export const createCache = (
  set: (store: AccessorCacheStoreSet<AccessorCacheStore>) => void,
): AccessorCacheStore => {
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
 * Creates an accessor.
 *
 * An accessor is a data query hook used to query data.
 *
 * This query hook utilizes suspense and proxies to make data querying easier on the client.
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
 * @param configuration.cacheDuration                   - How long, in seconds, the accessor cache should be used for before being invalidated.
 * @param configuration.cacheIsPrimableFromCache <true> - Determines if the accessor can be primed from the cache of other data accessors.
 *                                                        Once primed the `configuration.cacheDuration` will be respected.
 * @param configuration.cacheId                         - Synchrounous get function used to reference the accessor cache.
 * @param configuration.cacheSet                        - Synchrounous set function used to assign the query's response to cache.
 * @param configuration.cacheGet                        - Synchrounous get function used to construct the accessor response from cache.
 * @param configuration.query                           - Asynchrounous get function used to populate the accessor cache.
 *
 * @returns (cache: Cache, args: QueryRequest) => AccessorQueryResult<Data
 * @param cache                                         - Where to store cache data for data access.
 * @param args                                          - Arguments to send to the query.
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
  Cache extends AccessorCacheStore,
  QueryRequest,
  QueryResponse,
  Data
>({
  cacheDuration,
  cacheIsPrimableFromCache,
  cacheId,
  cacheSet,
  cacheGet,
  debug,
  query,
}: AccessorConfiguration<Cache, QueryRequest, QueryResponse, Data>): ((
  cache: () => Cache,
  args: QueryRequest,
) => AccessorQueryResult<Data>) => {
  const queryName = query.name;

  /*
   * Query promise.
   */
  const queryPromise = ({
    cache,
    cacheIdString,
    args,
  }: {
    cache: () => Cache;
    cacheIdString: string;
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
      return cacheSet({
        cacheId: cacheIdString,
        args,
        cache,
        request: (args: QueryRequest) => requestQueryPromise(cache, args),
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
    cache: () => Cache,
    args: QueryRequest,
  ): Promise<AccessorQueryResult<Data>> => {
    const {
      dataAccess: { set, query: cacheQuery },
    } = cache();

    // Do we have an existing query request promise in the cache?
    const cacheIdString = cacheId({ args });

    debug &&
      console.log(
        `[data-access:${queryName}:${cacheIdString}] read query cache.`,
      );

    const cacheQueryPromise = cacheQuery.get(cacheIdString)?.promise;
    if (cacheQueryPromise) {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheIdString}] query cache found.`,
        );
      return cacheQueryPromise;
    } else {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheIdString}] query cache *not* found.`,
        );
    }

    // Execute request query promise.
    debug &&
      console.log(`[data-access:${queryName}:${cacheIdString}] execute query.`);
    const promise: Promise<AccessorQueryResult<Data>> = queryPromise({
      cache,
      cacheIdString,
      args,
    });

    // Cache request query promise.
    set(
      produce<AccessorCacheStore>(({ dataAccess: { query: cacheQuery } }) => {
        cacheQuery.set(cacheIdString, {
          cacheTimeToRefresh: Date.now() + cacheDuration,
          // NOTE: This is stored in cache with a generic type of 'any'.
          //       Not sure why typescript doesn't throw here without type casting.
          promise,
        });
      }),
    );

    return promise;
  };

  /*
   * Suspend request query.
   */
  const suspenseRequestQuery = (
    cache: () => Cache,
    args: QueryRequest,
  ): AccessorQueryResult<Data> => {
    const {
      dataAccess: { set, suspense: cacheSuspense },
    } = cache();

    // Do we have an existing request in the cache?
    const cacheIdString = cacheId({ args });

    debug &&
      console.log(
        `[data-access:${queryName}:${cacheIdString}] read suspense cache.`,
      );

    const cacheRequestSuspense = cacheSuspense.get(cacheIdString);
    if (cacheRequestSuspense) {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheIdString}] suspense cache found for.`,
        );
      return cacheRequestSuspense();
    } else {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheIdString}] suspense cache *not* found.`,
        );
    }

    // Execute query request in suspense format.
    debug &&
      console.log(
        `[data-access:${queryName}:${cacheIdString}] expecute query promise.`,
      );
    const suspense: () => AccessorQueryResult<Data> = suspend(
      requestQueryPromise(cache, args),
    );

    // Cache suspended request query.
    set(
      produce<AccessorCacheStore>(
        ({ dataAccess: { suspense: cacheSuspense } }) => {
          cacheSuspense.set(
            cacheIdString,
            // NOTE: This is stored in cache with a generic type of 'any'.
            //       Not sure why typescript doesn't throw here without type casting.
            suspense,
          );
        },
      ),
    );

    // Execute suspense!
    return suspense();
  };

  /*
   * Accessor hook.
   */
  return (
    cache: () => Cache,
    args: QueryRequest,
  ): AccessorQueryResult<Data> => {
    const {
      dataAccess: { set, query: cacheQuery },
    } = cache();

    // Do we have a cached result?
    const cacheIdString = cacheId({ args });

    debug &&
      console.log(
        `[data-access:${queryName}:${cacheIdString}] execute request.`,
      );

    debug &&
      console.log(
        `[data-access:${queryName}:${cacheIdString}] read data cache.`,
      );

    const cacheRequestQuery = cacheQuery.get(cacheIdString);

    // Tell suspense about promise to request backend data.
    // Since this is a proxy designed to request data on access treat this as the real thing.
    const proxy = new Proxy(
      {},
      {
        get() {
          debug &&
            console.log(
              `[data-access:${queryName}:${cacheIdString}] execute suspense!`,
            );

          // Wrap promise in suspense format.
          return suspenseRequestQuery(cache, args);
        },
      },
    ) as Data;

    // Do we have the data for this request already?
    const cacheResult = cacheGet({
      cacheId: cacheIdString,
      cache,
      args,
      request: (args: QueryRequest) => requestQueryPromise(cache, args),
    });

    // Did we make a request for this data already?
    if (
      cacheRequestQuery &&
      (cacheRequestQuery.promise as any).state.isQueryFinished
    ) {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheIdString}] request query cache found.`,
        );
      // Do we need to invalidate the cache and request?
      if (Date.now() > cacheRequestQuery.cacheTimeToRefresh) {
        debug &&
          console.log(
            `[data-access:${queryName}:${cacheIdString}] request cache expired.`,
          );

        // Cache reset for query & suspense.
        set(
          produce<AccessorCacheStore>(
            ({
              dataAccess: { suspense: cacheSuspense, query: cacheQuery },
            }) => {
              cacheQuery.delete(cacheIdString);
              cacheSuspense.delete(cacheIdString);
            },
          ),
        );
      } else {
        if (cacheResult) {
          debug &&
            console.log(
              `[data-access:${queryName}:${cacheIdString}] request data cache used.`,
            );

          return cacheResult;
        }
      }
    } else {
      debug &&
        console.log(
          `[data-access:${queryName}:${cacheIdString}] request query cache *not* found.`,
        );

      // We haven't made this request before but can we prime it from cache?
      if (cacheIsPrimableFromCache && cacheResult) {
        debug &&
          console.log(
            `[data-access:${queryName}:${cacheIdString}] request query cache primed from data cache.`,
          );

        // Cache with resolved cache result.
        set(
          produce<AccessorCacheStore>(
            ({ dataAccess: { query: cacheQuery } }) => {
              cacheQuery.set(cacheIdString, {
                cacheTimeToRefresh: Date.now() + cacheDuration,
                // NOTE: This request cache promise is never checked/used.
                //       Only it's time to live property is relevant.
                promise: null,
              });
            },
          ),
        );

        debug &&
          console.log(
            `[data-access:${queryName}:${cacheIdString}] request data cache used for.`,
          );

        return cacheResult;
      }
    }

    return {
      data: proxy,
    };
  };
};
