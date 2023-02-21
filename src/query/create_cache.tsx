import {
  AccessorQueryCacheStore,
  AccessorQueryCacheStoreSet,
  AccessorQueryResult,
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
