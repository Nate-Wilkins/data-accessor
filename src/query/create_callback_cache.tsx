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
export const createCallbackCache = <T, K>(
  callback: () => Promise<T>,
  onInvalidate: () => K | Promise<K>,
  configuration: {
    ttl: number;
    invalidate: { auto: { enable: boolean; ttl: number } };
  },
): {
  callback: () => Promise<T>;
  invalidate: () => Promise<T>;
  unregister?: null | (() => void);
} => {
  // Configuration.
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

  // State.
  const data: { current: null | { dateCreated: number; data: T } } = {
    current: null,
  };

  const onSetData = (input: T) => {
    data.current = { dateCreated: Date.now(), data: input };
  };

  const callbackCache = async () => {
    // Get cache data.
    if (data.current) {
      // Did the data expire?
      if (Date.now() <= data.current.dateCreated + cTtl) {
        return data.current.data;
      } else {
        // Invalidate.
        await onInvalidate();
      }
    }

    // Set cache data.
    const response = await callback();
    onSetData(response);

    return response;
  };

  const callbackInvalidate = async () => {
    // Invalidate.
    await onInvalidate();

    // Set cache data.
    const response = await callback();
    onSetData(response);

    return response;
  };

  // Enable auto invalidation?
  let unregister: null | (() => void) = null;
  if (cInvalidateAutoEnable) {
    const interval = setInterval(() => {
      callbackInvalidate();
    }, cInvalidateAutoTtl);
    unregister = () => {
      clearInterval(interval);
    };
  }

  return {
    callback: callbackCache,
    invalidate: callbackInvalidate,
    unregister,
  };
};
