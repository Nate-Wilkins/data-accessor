import { useCallback, useEffect, useState } from 'react';

/**
 * Cache a callback for a specified ttl.
 *
 * @param callback - Callback call and cache.
 * @param onInvalidate - Callback to call when the cache expires.
 * @param configuration.ttl - How long the callback result should be cached for (Time to Live).
 * @param configuration.invalidate.auto.enable - Determines if auto invalidation is enabled.
 *                                               When enabled uses a `setInterval` to automatically invalidate
 *                                               the cache and rerender with new state changes.
 * @param configuration.invalidate.auto.ttl - How long the callback result should be cached for (Time to Live).
 */
export const useCallbackCache = <T, K>(
  callback: () => Promise<T>,
  onInvalidate: () => K | Promise<K>,
  configuration: {
    ttl: number;
    invalidate: { auto: { enable: boolean; ttl: number } };
  },
): { callback: () => Promise<T>; invalidate: () => Promise<T> } => {
  const cTtl = configuration.ttl;
  const cInvalidateAutoEnable = configuration.invalidate.auto.enable;
  const cInvalidateAutoTtl = configuration.invalidate.auto.ttl;

  // Validate configuration.
  if (cTtl <= 0) {
    throw new Error('Provided `configuration.ttl` must be greater than zero.');
  }
  if (cInvalidateAutoEnable && cInvalidateAutoTtl <= 0) {
    throw new Error(
      'Provided `configuration.invalidate.auto.ttl` must be greater than zero.',
    );
  }

  const [data, setData] = useState<null | { dateCreated: number; data: T }>(
    null,
  );

  const onSetData = useCallback((data: T) => {
    setData({ dateCreated: Date.now(), data });
  }, []);

  const callbackCache = useCallback(async () => {
    // Get cache data.
    if (data) {
      // Did the data expire?
      if (Date.now() <= data.dateCreated + cTtl) {
        return data.data;
      } else {
        // Invalidate.
        await onInvalidate();
      }
    }

    // Set cache data.
    const response = await callback();
    onSetData(response);

    return response;
  }, [data, callback, onInvalidate, cTtl, onSetData]);

  const callbackInvalidate = useCallback(async () => {
    // Invalidate.
    await onInvalidate();

    // Set cache data.
    const response = await callback();
    onSetData(response);

    return response;
  }, [callback, onInvalidate, onSetData]);

  // Enable auto invalidation?
  useEffect(() => {
    if (!cInvalidateAutoEnable) {
      return;
    }

    const interval = setInterval(() => {
      callbackInvalidate();
    }, cInvalidateAutoTtl);

    return () => {
      clearInterval(interval);
    };
  }, [callbackInvalidate, cInvalidateAutoEnable, cInvalidateAutoTtl]);

  return { callback: callbackCache, invalidate: callbackInvalidate };
};
