import { useCallback, useState } from 'react';

/**
 * Callback caller keeps track of how many calls the callback has made.
 *
 * @param callback - Callback to call.
 * @param configuration.reset - Whether or not `called` count should reset when `max` is exceeded.
 * @param configuration.max - The max state value for `called`.
 */
export const useCallbackCaller = <T,>(
  callback: () => Promise<T>,
  configuration: { reset: boolean; max: number },
): { count: number; callback: () => Promise<T> } => {
  // Configuration.
  const cReset = configuration.reset;
  const cMax = configuration.max;

  // State.
  const [count, setCount] = useState(0);

  const callerCallback = useCallback(async () => {
    const result = await callback();

    // Increase count.
    if (count < cMax) {
      setCount(v => v + 1);
    } else {
      if (cReset) {
        setCount(1);
      }
    }

    return result;
  }, [count, callback, cReset, cMax]);

  return {
    count,
    callback: callerCallback,
  };
};
