import { suspend } from '../suspend';

/**
 * Create a lazy suspense callback.
 *
 * Will provide a proxy for a callback to provide a "lazy loading" like workflow.
 *
 * @param callback - Callback to call when the proxy is invoked.
 */
export const createLazySuspense = <T,>(
  cacheId: string,
  callback: () => Promise<T>,
  cacheGet: (k: string) => (() => T) | null | undefined,
  cacheSet: (k: string, v: () => T) => void,
): T => {
  // 1. Setup proxy.
  //    Designed to request data on access, treat this as the real "T" data.
  const proxy = new Proxy(
    {},
    {
      get() {
        // 3. Invoke suspense!
        const suspense = suspend(callback());
        cacheSet(cacheId, suspense);
        const result = suspense();
        return result;
      },
    },
  ) as T;

  // 2. Check to see if cache has a suspended promise.
  //    If it does return the cached suspense, otherwise return the proxy.
  const callbackSuspense = cacheGet(cacheId);
  const value = callbackSuspense ? callbackSuspense() : proxy;
  return value;
};
