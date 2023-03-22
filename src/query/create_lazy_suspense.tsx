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
  // Proxy designed to request data on access, treat this as the real "T" data.
  const proxy = new Proxy(
    {},
    {
      get() {
        // Invoke suspense!
        const suspense = suspend(callback());
        cacheSet(cacheId, suspense);
        const result = suspense();
        // NOTE: Currently never returned, unless some client code persists the proxy which isn't
        //       currently recommended.
        return result;
      },
    },
  ) as T;

  const callbackSuspense = cacheGet(cacheId);
  const value = callbackSuspense ? callbackSuspense() : proxy;
  return value;
};
