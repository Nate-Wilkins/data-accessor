import { useCallback, useState } from 'react';

/**
 * Callback limiter limits the callback from being called more than 'n' times.
 *
 * @param callback - Callback to wrap with limiter.
 * @param configuration.max - Number of times the callback can be called before the `defaultValue` is returned.
 *                            If less than 0, `callback` will always be called.
 * @param configuration.defaultValue - Data to return for when the `limit` is reached.
 * @param configuration.reset - Whether or not to reset limiter when `max` is exceeded.
 */
export const useCallbackLimiter = <T, K>(
  callback: () => Promise<T>,
  configuration: { max: number; defaultValue: K; reset: boolean },
): { count: number; callback: () => Promise<T | K> } => {
  // Configuration.
  const cMax = configuration.max;
  const cDefaultValue = configuration.defaultValue;
  const cReset = configuration.reset;

  // State.
  const [count, setCount] = useState<number>(0);

  const callbackLimiter = useCallback(async () => {
    let result: T | K;
    if (cMax < 0) {
      result = await callback();
    } else {
      if (count < cMax) {
        result = await callback();
        setCount(v => v + 1);
      } else {
        result = cDefaultValue;
        if (cReset) {
          setCount(0);
        }
      }
    }
    return result;
  }, [count, callback, cMax, cDefaultValue, cReset]);

  return { count, callback: callbackLimiter };
};
